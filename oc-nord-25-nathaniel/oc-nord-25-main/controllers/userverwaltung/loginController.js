"use strict";

const loginModel = require('../../models/userverwaltung/loginModel');

const renderLogin = (req, res) => {
    res.render('userverwaltung/login', {
        t: req.t,
        language: req.language
    });
};

const processLogin = async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const rememberMe = req.body.rememberMe; // Checkbox-Wert

    // Benutzer in der Datenbank suchen
    const user = await loginModel.findUser(email, password);

    if (user) {
        // Benutzer gefunden - Session setzen
        req.session.user = user;
        req.session.loggedIn = true;

        // Cookie-Dauer setzen je nach "Angemeldet bleiben"
        if (rememberMe) {
            // 7 Tage in Millisekunden (7 * 24 * 60 * 60 * 1000)
            req.session.cookie.maxAge = 30
                * 24 * 60 * 60 * 1000;
        } else {
            // Session-Cookie (wird beim Schließen des Browsers gelöscht)
            req.session.cookie.maxAge = null;
        }

        // Zur Hauptseite weiterleiten
        res.redirect('/');
    } else {
        // Benutzer nicht gefunden - zurück zur Login-Seite
        res.redirect('/login');
    }
};

const logout = (req, res) => {
    // Session löschen
    req.session.destroy((err) => {
        if (err) {
            console.log('Fehler beim Abmelden:', err);
        }
        // Zur Hauptseite weiterleiten
        res.redirect('/');
    });
};

module.exports = {
    renderLogin,
    processLogin,
    logout
};