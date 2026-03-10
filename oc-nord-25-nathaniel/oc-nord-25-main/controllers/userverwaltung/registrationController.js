"use strict";

const registrationModel = require('../../models/userverwaltung/registrationModel');

const renderRegister = (req, res) => {
    res.render('userverwaltung/register', {
        t: req.t,
        language: req.language
    });
};

const processRegister = async (req, res) => {
    const { name, email, password, confirmPassword } = req.body;

    // Validierung
    if (!name || !email || !password || !confirmPassword) {
        return res.render('userverwaltung/register', {
            error: 'Bitte alle Felder ausfüllen'
        });
    }

    if (password !== confirmPassword) {
        return res.render('userverwaltung/register', {
            error: 'Passwörter stimmen nicht überein'
        });
    }

    if (password.length < 6) {
        return res.render('userverwaltung/register', {
            error: 'Passwort muss mindestens 6 Zeichen lang sein'
        });
    }

    try {
        // Prüfen ob User bereits existiert
        const existingUser = await registrationModel.findUserByEmail(email);

        if (existingUser) {
            return res.render('userverwaltung/register', {
                error: 'Diese E-Mail-Adresse ist bereits registriert'
            });
        }

        // Neuen User erstellen
        const newUser = await registrationModel.createUser({
            name,
            email,
            password
        });

        if (newUser) {
            // Benutzer automatisch einloggen nach Registrierung
            req.session.user = newUser;
            req.session.loggedIn = true;

            // Zur Shop/Subscription Seite weiterleiten
            res.redirect('/shop/subscription');
        } else {
            res.render('userverwaltung/register', {
                error: 'Fehler bei der Registrierung. Bitte versuchen Sie es erneut.'
            });
        }
    } catch (error) {
        console.error('Fehler bei der Registrierung:', error);
        res.render('userverwaltung/register', {
            error: 'Serverfehler bei der Registrierung'
        });
    }
};

module.exports = {
    renderRegister,
    processRegister
};
