"use strict";
const iframeSettingsModel = require('../../models/configIframe/iframeSettingsModel');
const { saveOutofplan, loadOutofplanForCustomer, deleteOutofplan } = require('../../models/configIframe/outofplanModel');

// Render the config iframe page
const renderConfig = (req, res) => {
    // Session-Daten prüfen und ausgeben (Debug)
    console.log('Session in configServerController:', {
        loggedIn: req.session?.loggedIn,
        hasUser: !!req.session?.user,
        sessionID: req.sessionID
    });

    const isLoggedIn = req.session?.loggedIn || false;
    const user = req.session?.user || null;
    const isAdmin = user?.isAdmin || user?.admin || false;

    res.render('configIframe/config_Iframe', {
        isLoggedIn: isLoggedIn,
        user: user,
        isAdmin: isAdmin,
        language: req.language
    });
}

// API: Einstellungen laden
const getSettings = async (req, res) => {
    try {
        // Prüfen ob eingeloggt
        if (!req.session?.loggedIn) {
            return res.status(401).json({ success: false, error: 'Nicht eingeloggt' });
        }

        // customerId aus Session holen
        const customerId = req.session.user?._id?.toString() || req.session.user?.id?.toString() || 'demo-user';
        console.log('Loading settings for customerId:', customerId);

        const settings = await iframeSettingsModel.getOrCreateSettings(customerId);
        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Error loading settings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// API: Einstellungen speichern
const saveSettings = async (req, res) => {
    try {
        // Prüfen ob eingeloggt
        if (!req.session?.loggedIn) {
            return res.status(401).json({ success: false, error: 'Nicht eingeloggt' });
        }

        // customerId aus Session holen
        const customerId = req.session.user?._id?.toString() || req.session.user?.id?.toString() || 'demo-user';
        console.log('Saving settings for customerId:', customerId);

        const settingsData = {
            zeitzone: req.body.zeitzone,
            hintergrundfarbeOffen: req.body.hintergrundfarbeOffen,
            hintergrundfarbeGeschlossen: req.body.hintergrundfarbeGeschlossen,
            textfarbeOffen: req.body.textfarbeOffen,
            textfarbeGeschlossen: req.body.textfarbeGeschlossen,
            schriftartOffen: req.body.schriftartOffen,
            schriftartGeschlossen: req.body.schriftartGeschlossen,
            vorauswahlen: req.body.vorauswahlen
        };

        const settings = await iframeSettingsModel.saveSettings(customerId, settingsData);
        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// API: Ausserplanmässig speichern
const saveOutofplanEntry = async (req, res) => {
    try {
        console.log('=== saveOutofplanEntry called ===');
        console.log('Request body:', JSON.stringify(req.body, null, 2));

        // Prüfen ob eingeloggt
        if (!req.session?.loggedIn) {
            console.log('ERROR: User not logged in');
            return res.status(401).json({ success: false, error: 'Nicht eingeloggt' });
        }

        // customerId aus Session holen
        const customerId = req.session.user?._id?.toString() || req.session.user?.id?.toString() || 'demo-user';
        console.log('Saving outofplan for customerId:', customerId);

        // Daten validieren
        const { datumVon, datumBis, zeitVon, zeitBis, offen, beschreibungen } = req.body;

        console.log('Extracted fields:', { datumVon, datumBis, zeitVon, zeitBis, offen });

        if (!datumVon || !datumBis || !zeitVon || !zeitBis) {
            console.log('ERROR: Missing required fields');
            return res.status(400).json({
                success: false,
                error: 'Alle Datums- und Zeitfelder müssen ausgefüllt sein'
            });
        }

        // Validierung: Bis-Datum nach Von-Datum
        const vonDate = new Date(datumVon);
        const bisDate = new Date(datumBis);

        console.log('Date validation:', { vonDate, bisDate, isValid: bisDate >= vonDate });

        if (bisDate < vonDate) {
            console.log('ERROR: End date before start date');
            return res.status(400).json({
                success: false,
                error: 'Das Bis-Datum muss nach dem Von-Datum liegen'
            });
        }

        const outofplanData = {
            datumVon,
            datumBis,
            zeitVon,
            zeitBis,
            offen: offen === true || offen === 'true'
        };

        console.log('Calling saveOutofplan with:', { customerId, outofplanData, beschreibungen });

        const entry = await saveOutofplan(customerId, outofplanData, beschreibungen);

        console.log('Successfully saved entry:', entry._id);

        res.json({ success: true, data: entry });
    } catch (error) {
        console.error('ERROR in saveOutofplanEntry:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ success: false, error: error.message });
    }
}

// API: Ausserplanmässig laden
const getOutofplanEntries = async (req, res) => {
    try {
        // Prüfen ob eingeloggt
        if (!req.session?.loggedIn) {
            return res.status(401).json({ success: false, error: 'Nicht eingeloggt' });
        }

        // customerId aus Session holen
        const customerId = req.session.user?._id?.toString() || req.session.user?.id?.toString() || 'demo-user';
        console.log('Loading outofplan for customerId:', customerId);

        const entries = await loadOutofplanForCustomer(customerId);
        res.json({ success: true, data: entries });
    } catch (error) {
        console.error('Error loading outofplan:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// API: Ausserplanmässig löschen
const deleteOutofplanEntry = async (req, res) => {
    try {
        // Prüfen ob eingeloggt
        if (!req.session?.loggedIn) {
            return res.status(401).json({ success: false, error: 'Nicht eingeloggt' });
        }

        // customerId aus Session holen
        const customerId = req.session.user?._id?.toString() || req.session.user?.id?.toString() || 'demo-user';
        console.log('Deleting outofplan for customerId:', customerId);

        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Keine ID angegeben'
            });
        }

        await deleteOutofplan(id, customerId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting outofplan:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = {
    renderConfig,
    getSettings,
    saveSettings,
    saveOutofplanEntry,
    getOutofplanEntries,
    deleteOutofplanEntry
};
