"use strict";

const kundenanzeigenModel = require('../../models/userverwaltung/kundenanzeigenModel');

/**
 * Kundenanzeige anzeigen mit Sortierung
 * Holt alle Kunden aus der Datenbank und sortiert sie
 */
const renderKundenanzeige = async (req, res) => {
    try {
        // Sortier-Parameter aus URL holen (Standard: nach Eintrittsdatum absteigend)
        const sortBy = req.query.sortBy || 'eintrittsdatum';
        const sortOrder = req.query.sortOrder || 'desc';
        
        // Success/Error-Meldungen aus URL holen
        const success = req.query.success || null;
        const error = req.query.error || null;
        
        // Kunden mit Sortierung aus Datenbank holen
        const customers = await kundenanzeigenModel.getAllCustomersSorted(sortBy, sortOrder);
        
        // HTML-Seite anzeigen mit Kundendaten
        res.render('userverwaltung/kundenanzeige', {
            customers: customers,
            user: req.session.user,
            isLoggedIn: req.session.loggedIn || false,
            isAdmin: req.session.user?.isAdmin || false,
            language: req.language || 'de',
            sortBy: sortBy,
            sortOrder: sortOrder,
            success: success,
            error: error
        });
    } catch (error) {
        console.error('Fehler beim Laden der Kundenanzeige:', error);
        res.status(500).send('Serverfehler');
    }
};

/**
 * Kunden-Bearbeitungsseite anzeigen
 */
const renderEditKunde = async (req, res) => {
    try {
        const customerId = req.params.id;
        
        // Kunde aus Datenbank holen
        const customer = await kundenanzeigenModel.getCustomerById(customerId);
        
        if (!customer) {
            return res.status(404).send('Kunde nicht gefunden');
        }
        
        // Edit-Seite anzeigen
        res.render('userverwaltung/kunde-edit', {
            customer: customer,
            user: req.session.user,
            isLoggedIn: req.session.loggedIn || false,
            isAdmin: req.session.user?.isAdmin || false,
            language: req.language || 'de'
        });
    } catch (error) {
        console.error('Fehler beim Laden der Bearbeitungsseite:', error);
        res.status(500).send('Serverfehler');
    }
};

/**
 * Kundendaten aktualisieren
 */
const updateKunde = async (req, res) => {
    try {
        const customerId = req.params.id;
        const customerData = req.body;
        
        // Daten aktualisieren
        const success = await kundenanzeigenModel.updateCustomerData(customerId, customerData);
        
        if (success) {
            res.redirect('/admin/kundenanzeige?success=Kunde erfolgreich aktualisiert');
        } else {
            res.redirect(`/admin/kundenanzeige/edit/${customerId}?error=Fehler beim Aktualisieren`);
        }
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Kunden:', error);
        res.status(500).send('Serverfehler');
    }
};

/**
 * Kunden löschen
 */
const deleteKunde = async (req, res) => {
    try {
        const customerId = req.params.id;
        
        // Kunde löschen
        const success = await kundenanzeigenModel.deleteCustomer(customerId);
        
        if (success) {
            res.redirect('/admin/kundenanzeige?success=Kunde erfolgreich gelöscht');
        } else {
            res.redirect('/admin/kundenanzeige?error=Fehler beim Löschen des Kunden');
        }
    } catch (error) {
        console.error('Fehler beim Löschen des Kunden:', error);
        res.status(500).send('Serverfehler');
    }
};

/**
 * iFrame-Status eines Kunden aktualisieren (Freischalten/Sperren)
 */
const toggleIframeStatus = async (req, res) => {
    try {
        const customerId = req.params.id;
        const { iframeEnabled } = req.body;
        
        // Wenn man freischalten möchte, setze das Ablaufdatum auf 1 Jahr ab jetzt
        if (iframeEnabled) {
            const customer = await kundenanzeigenModel.getCustomerById(customerId);
            if (!customer) {
                return res.json({ success: false, message: 'Kunde nicht gefunden' });
            }
            
            // Setze das Ablaufdatum auf 1 Jahr ab dem heutigen Datum
            const newEndDate = new Date();
            newEndDate.setFullYear(newEndDate.getFullYear() + 1);
            
            // Aktualisiere iFrame-Status UND Ablaufdatum
            const success = await kundenanzeigenModel.updateIframeStatusAndExpiry(customerId, iframeEnabled, newEndDate);
            
            if (success) {
                const formattedDate = newEndDate.toLocaleDateString('de-DE');
                res.json({ success: true, message: `iFrame aktiviert. Neues Ablaufdatum: ${formattedDate}` });
            } else {
                res.json({ success: false, message: 'Fehler beim Aktualisieren' });
            }
        } else {
            // Wenn man sperrt, nur Status ändern (kein Ablaufdatum-Update)
            const success = await kundenanzeigenModel.updateIframeStatus(customerId, iframeEnabled);
            
            if (success) {
                res.json({ success: true, message: 'iFrame gesperrt' });
            } else {
                res.json({ success: false, message: 'Fehler beim Aktualisieren des iFrame-Status' });
            }
        }
    } catch (error) {
        console.error('Fehler beim Aktualisieren des iFrame-Status:', error);
        res.status(500).json({ success: false, message: 'Serverfehler' });
    }
};

module.exports = {
    renderKundenanzeige,
    renderEditKunde,
    updateKunde,
    deleteKunde,
    toggleIframeStatus
};
