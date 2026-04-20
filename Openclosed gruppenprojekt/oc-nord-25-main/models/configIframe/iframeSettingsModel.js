"use strict";
const mongoose = require('mongoose');

// Schema für iFrame-Einstellungen
const iframeSettingsSchema = new mongoose.Schema({
    customerId: {
        type: String,
        required: true,
        index: true,
        unique: true
    },
    zeitzone: {
        type: Number,
        default: 1 // 1 = Europe/Zurich
    },
    hintergrundfarbeOffen: {
        type: String,
        default: '#ffffff'
    },
    hintergrundfarbeGeschlossen: {
        type: String,
        default: '#e0e0e0'
    },
    textfarbeOffen: {
        type: String,
        default: '#000000'
    },
    textfarbeGeschlossen: {
        type: String,
        default: '#333333'
    },
    schriftartOffen: {
        type: String,
        default: 'Arial'
    },
    schriftartGeschlossen: {
        type: String,
        default: 'Arial'
    },
    vorauswahlen: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true, // Erstellt automatisch createdAt und updatedAt
    collection: 'iFrame_settings'
});

const IframeSettings = mongoose.model('IframeSettings', iframeSettingsSchema);

module.exports = {
    IframeSettings,

    // Einstellungen für einen Kunden laden oder neue erstellen
    async getOrCreateSettings(customerId) {
        try {
            let settings = await IframeSettings.findOne({ customerId });

            if (!settings) {
                settings = new IframeSettings({ customerId });
                await settings.save();
            }

            return settings;
        } catch (error) {
            console.error('Error in getOrCreateSettings:', error);
            throw error;
        }
    },

    // Einstellungen speichern/aktualisieren
    async saveSettings(customerId, settingsData) {
        try {
            const settings = await IframeSettings.findOneAndUpdate(
                { customerId },
                settingsData,
                {
                    new: true,
                    upsert: true,
                    runValidators: true
                }
            );

            return settings;
        } catch (error) {
            console.error('Error in saveSettings:', error);
            throw error;
        }
    },

    // Einstellungen laden
    async loadSettings(customerId) {
        try {
            return await IframeSettings.findOne({ customerId });
        } catch (error) {
            console.error('Error in loadSettings:', error);
            throw error;
        }
    },

    // Einstellungen löschen
    async deleteSettings(customerId) {
        try {
            return await IframeSettings.findOneAndDelete({ customerId });
        } catch (error) {
            console.error('Error in deleteSettings:', error);
            throw error;
        }
    }
};
