"use strict";

// Middleware um zu prüfen ob User eingeloggt ist
const requireAuth = (req, res, next) => {
    if (req.session && req.session.loggedIn && req.session.user) {
        // User ist eingeloggt, weiter zur nächsten Route
        next();
    } else {
        // User ist nicht eingeloggt, zu Registrierung weiterleiten
        res.redirect('/register');
    }
};

// Middleware um zu prüfen ob User Admin ist
const requireAdmin = (req, res, next) => {
    if (req.session && req.session.loggedIn && req.session.user && req.session.user.isAdmin) {
        // User ist Admin, weiter zur nächsten Route
        next();
    } else {
        // User ist kein Admin, Zugriff verweigern
        res.status(403).send('Zugriff verweigert. Sie benötigen Admin-Rechte.');
    }
};

// Middleware um eingeloggten User Info an alle Views zu übergeben
const attachUser = (req, res, next) => {
    res.locals.user = req.session?.user || null;
    res.locals.loggedIn = req.session?.loggedIn || false;
    res.locals.isAdmin = req.session?.user?.isAdmin || false;
    next();
};

module.exports = {
    requireAuth,
    requireAdmin,
    attachUser
};