"use strict";
const Order = require('../../models/shop/orderModel');

const renderHome = async (req, res) => {
    // Prüfen ob Benutzer angemeldet ist
    const isLoggedIn = req.session.loggedIn || false;
    const user = req.session.user || null;
    const isAdmin = user?.isAdmin || user?.admin || false;

    // Prüfen, ob der eingeloggte User ein aktives (bezahltes) Abo hat
    let hasActiveSubscription = false;
    if (user?._id) {
        try {
            const existingOrder = await Order.findOne({
                userId: user._id,
                status: 'paid'
            }).lean();
            hasActiveSubscription = !!existingOrder;
        } catch (err) {
            console.warn('Konnte bestehenden Auftrag nicht prüfen:', err.message);
        }
    }

    // i18n Übersetzungsfunktion an View übergeben
    res.render('home', {
        isLoggedIn,
        user,
        isAdmin,
        hasActiveSubscription,
        t: req.t.bind(req),
        language: req.language
    });
}

module.exports = {
    renderHome
};
