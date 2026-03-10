"use strict";

const mongoose = require('mongoose');
const userModel = require('../../models/userverwaltung/userModel');
const Order = require('../../models/shop/orderModel');

// Datenverwaltung Seite anzeigen
const renderDatenverwaltung = (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }
    
    res.render('userverwaltung/datenverwaltung', {
        isLoggedIn: req.session.loggedIn,
        user: req.session.user
    });
};

// Datenverwaltung Daten speichern
const updateDatenverwaltung = async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }
    
    try {
        const userId = req.session.user._id;
        
        // Prüfen ob Passwort geändert werden soll
        if (req.body.currentPassword && req.body.newPassword) {
            if (req.body.newPassword !== req.body.confirmPassword) {
                return res.render('userverwaltung/datenverwaltung', {
                    isLoggedIn: req.session.loggedIn,
                    user: req.session.user,
                    error: 'Die neuen Passwörter stimmen nicht überein'
                });
            }
            
            const passwordResult = await userModel.updatePassword(
                userId,
                req.body.currentPassword,
                req.body.newPassword
            );
            
            if (!passwordResult.success) {
                return res.render('userverwaltung/datenverwaltung', {
                    isLoggedIn: req.session.loggedIn,
                    user: req.session.user,
                    error: passwordResult.error || 'Fehler beim Ändern des Passworts'
                });
            }
        }
        
        // User-Daten aktualisieren
        const userData = {
            name: req.body.name || req.session.user.name,
            StreetAndHousenumber: req.body.StreetAndHousenumber,
            PLZ: req.body.PLZ,
            City: req.body.City,
            Country: req.body.Country,
            URL: req.body.URL,
            Coordinates_x: req.body.Coordinates_x,
            Coordinates_y: req.body.Coordinates_y
        };
        
        const success = await userModel.updateUserData(userId, userData);
        
        if (success) {
            // Aktualisierte Daten in Session speichern
            const updatedUser = await userModel.getUserById(userId);
            req.session.user = updatedUser;
            
            res.render('userverwaltung/datenverwaltung', {
                isLoggedIn: req.session.loggedIn,
                user: updatedUser,
                success: 'Ihre Daten wurden erfolgreich aktualisiert'
            });
        } else {
            res.render('userverwaltung/datenverwaltung', {
                isLoggedIn: req.session.loggedIn,
                user: req.session.user,
                error: 'Fehler beim Speichern der Daten'
            });
        }
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Datenverwaltung:', error);
        res.render('userverwaltung/datenverwaltung', {
            isLoggedIn: req.session.loggedIn,
            user: req.session.user,
            error: 'Serverfehler beim Speichern'
        });
    }
};

// iFrame Konfiguration Seite anzeigen
const renderIframeConfig = (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }
    
    res.render('userverwaltung/iframe-config', {
        isLoggedIn: req.session.loggedIn,
        user: req.session.user
    });
};

// Bestellhistorie Seite anzeigen
const renderBestellhistorie = async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }

    try {
        const userId = req.session.user?._id;
        const email = req.session.user?.email;

        const filters = [];
        if (userId) filters.push({ userId: new mongoose.Types.ObjectId(userId) });
        if (email) filters.push({ customerEmail: email });

        let orders = [];
        if (filters.length > 0) {
            orders = await Order.find({ $or: filters })
                .sort({ createdAt: -1 })
                .lean();
        }

        // Aufbereiten für die View
        const statusClasses = {
            paid: 'badge bg-success',
            pending: 'badge bg-warning text-dark',
            cancelled: 'badge bg-secondary',
            refunded: 'badge bg-info text-dark',
            failed: 'badge bg-danger'
        };

        const preparedOrders = orders.map((order) => {
            const status = order.status || 'pending';
            const currency = order.currency || 'EUR';
            return {
                ...order,
                formattedOrderId: order.orderId ? `#${order.orderId}` : '—',
                dateFormatted: order.createdAt
                    ? new Date(order.createdAt).toLocaleDateString('de-DE')
                    : '-',
                totalFormatted: typeof order.totalAmount === 'number'
                    ? `${order.totalAmount.toFixed(2)} ${currency}`
                    : '-',
                itemNames: Array.isArray(order.items)
                    ? order.items.map((i) => i.name).join(', ')
                    : '-',
                statusClass: statusClasses[status] || 'badge bg-secondary'
            };
        });

        res.render('userverwaltung/bestellhistorie', {
            isLoggedIn: req.session.loggedIn,
            user: req.session.user,
            orders: preparedOrders
        });
    } catch (error) {
        console.error('Fehler beim Laden der Bestellhistorie:', error);
        res.render('userverwaltung/bestellhistorie', {
            isLoggedIn: req.session.loggedIn,
            user: req.session.user,
            orders: [],
            error: 'Bestellhistorie konnte nicht geladen werden.'
        });
    }
};

module.exports = {
    renderDatenverwaltung,
    updateDatenverwaltung,
    renderIframeConfig,
    renderBestellhistorie
};
