"use strict";

const adminModel = require('../../models/userverwaltung/adminModel');

// Kundenanzeige - zeigt alle registrierten User
const renderKundenanzeige = async (req, res) => {
    try {
        const customers = await adminModel.getAllCustomers();
        res.render('userverwaltung/kundenanzeige', {
            customers: customers,
            user: req.session.user
        });
    } catch (error) {
        console.error('Fehler beim Laden der Kundenanzeige:', error);
        res.status(500).send('Serverfehler');
    }
};

// Rechnungen - zeigt alle Bestellungen/Abonnements
const renderRechnungen = async (req, res) => {
    try {
        const orders = await adminModel.getAllOrders();
        res.render('userverwaltung/rechnungen', {
            orders: orders,
            user: req.session.user,
            isLoggedIn: req.session.loggedIn || false,
            isAdmin: req.session.user?.isAdmin || false,
            language: req.language || 'de'
        });
    } catch (error) {
        console.error('Fehler beim Laden der Rechnungen:', error);
        res.status(500).send('Serverfehler');
    }
};

// Einzelne Rechnung anzeigen
const renderRechnung = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await adminModel.getOrderById(orderId);
        
        if (!order) {
            return res.status(404).send('Rechnung nicht gefunden');
        }
        
        res.render('userverwaltung/rechnung-detail', {
            order: order,
            user: req.session.user,
            isLoggedIn: req.session.loggedIn || false,
            isAdmin: req.session.user?.isAdmin || false,
            language: req.language || 'de'
        });
    } catch (error) {
        console.error('Fehler beim Laden der Rechnung:', error);
        res.status(500).send('Serverfehler');
    }
};

// Statistiken - zeigt Übersicht und Statistiken
const renderStatistiken = async (req, res) => {
    try {
        const stats = await adminModel.getStatistics();
        res.render('userverwaltung/statistic', {
            stats: stats,
            user: req.session.user,
            isLoggedIn: req.session.loggedIn || false,
            isAdmin: req.session.user?.isAdmin || false,
            language: req.language || 'de'
        });
    } catch (error) {
        console.error('Fehler beim Laden der Statistiken:', error);
        res.status(500).send('Serverfehler');
    }
};

module.exports = {
    renderKundenanzeige,
    renderRechnungen,
    renderRechnung,
    renderStatistiken
};
