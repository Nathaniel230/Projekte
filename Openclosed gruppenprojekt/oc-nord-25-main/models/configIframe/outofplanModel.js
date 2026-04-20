"use strict";
const mongoose = require('mongoose');

// Schema für Ausserplanmässiges Schliessen/Öffnen
const outofplanSchema = new mongoose.Schema({
    customerId: {
        type: String,
        required: true,
        index: true
    },
    datumVon: {
        type: Date,
        required: true
    },
    datumBis: {
        type: Date,
        required: true
    },
    zeitVon: {
        type: String, // Format: "HH:MM"
        required: true
    },
    zeitBis: {
        type: String, // Format: "HH:MM"
        required: true
    },
    offen: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    collection: 'iFrame_outofplan'
});

// Schema für Beschreibung Ausserplanmässiges
const outofplanTextSchema = new mongoose.Schema({
    idAusserplanmaesiges: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Outofplan',
        required: true,
        index: true
    },
    sprache: {
        type: String,
        required: true,
        enum: ['de', 'en', 'fr', 'it', 'es']
    },
    inhalt: {
        type: String,
        required: true
    }
}, {
    timestamps: true,
    collection: 'iFrame_outofplan_text'
});

const Outofplan = mongoose.model('Outofplan', outofplanSchema);
const OutofplanText = mongoose.model('OutofplanText', outofplanTextSchema);

module.exports = {
    Outofplan,
    OutofplanText,

    // Ausserplanmässig speichern mit Beschreibungen
    async saveOutofplan(customerId, outofplanData, beschreibungen) {
        try {
            console.log('=== saveOutofplan Model called ===');
            console.log('customerId:', customerId);
            console.log('outofplanData:', outofplanData);
            console.log('beschreibungen:', beschreibungen);

            // Validierung: Bis-Datum muss nach Von-Datum sein
            const vonDate = new Date(outofplanData.datumVon);
            const bisDate = new Date(outofplanData.datumBis);

            if (bisDate < vonDate) {
                throw new Error('Das Bis-Datum muss nach dem Von-Datum liegen');
            }

            // Ausserplanmässig-Eintrag erstellen
            const outofplan = new Outofplan({
                customerId,
                datumVon: outofplanData.datumVon,
                datumBis: outofplanData.datumBis,
                zeitVon: outofplanData.zeitVon,
                zeitBis: outofplanData.zeitBis,
                offen: outofplanData.offen
            });

            console.log('Saving outofplan document...');
            await outofplan.save();
            console.log('Outofplan saved with ID:', outofplan._id);

            // Beschreibungen speichern (für alle vorhandenen Sprachen)
            if (beschreibungen && Object.keys(beschreibungen).length > 0) {
                const textEntries = [];

                for (const [sprache, inhalt] of Object.entries(beschreibungen)) {
                    if (inhalt && inhalt.trim() !== '') {
                        textEntries.push({
                            idAusserplanmaesiges: outofplan._id,
                            sprache: sprache,
                            inhalt: inhalt.trim()
                        });
                    }
                }

                if (textEntries.length > 0) {
                    console.log('Saving', textEntries.length, 'text entries...');
                    await OutofplanText.insertMany(textEntries);
                    console.log('Text entries saved successfully');
                }
            }

            console.log('=== saveOutofplan completed successfully ===');
            return outofplan;
        } catch (error) {
            console.error('ERROR in saveOutofplan Model:', error);
            console.error('Error stack:', error.stack);
            throw error;
        }
    },

    // Alle Ausserplanmässig-Einträge für einen Kunden laden
    async loadOutofplanForCustomer(customerId) {
        try {
            const entries = await Outofplan.find({ customerId }).sort({ datumVon: 1 });

            // Für jeden Eintrag die Beschreibungen laden
            const entriesWithText = await Promise.all(
                entries.map(async (entry) => {
                    const texts = await OutofplanText.find({ idAusserplanmaesiges: entry._id });
                    const beschreibungen = {};

                    texts.forEach(text => {
                        beschreibungen[text.sprache] = text.inhalt;
                    });

                    return {
                        ...entry.toObject(),
                        beschreibungen
                    };
                })
            );

            return entriesWithText;
        } catch (error) {
            console.error('Error in loadOutofplanForCustomer:', error);
            throw error;
        }
    },

    // Ausserplanmässig-Eintrag löschen
    async deleteOutofplan(outofplanId, customerId) {
        try {
            // Prüfen ob der Eintrag dem Kunden gehört
            const entry = await Outofplan.findOne({ _id: outofplanId, customerId });

            if (!entry) {
                throw new Error('Eintrag nicht gefunden oder keine Berechtigung');
            }

            // Zuerst die Beschreibungen löschen
            await OutofplanText.deleteMany({ idAusserplanmaesiges: outofplanId });

            // Dann den Eintrag selbst
            await Outofplan.findByIdAndDelete(outofplanId);

            return true;
        } catch (error) {
            console.error('Error in deleteOutofplan:', error);
            throw error;
        }
    }
};
