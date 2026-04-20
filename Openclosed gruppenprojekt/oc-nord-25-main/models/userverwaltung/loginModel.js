const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Funktion um Benutzer zu finden und Passwort zu prüfen
const findUser = async (email, password) => {
    try {
        // Verbinde zur users Collection in der Datenbank
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        // Suche Benutzer nur mit E-Mail
        const user = await usersCollection.findOne({ email: email });
        
        if (!user) {
            return null; // User nicht gefunden
        }
        
        // Passwort mit bcrypt vergleichen
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (isPasswordValid) {
            return user; // Passwort ist korrekt
        } else {
            return null; // Passwort ist falsch
        }
    } catch (error) {
        console.error('Fehler beim Suchen des Benutzers:', error);
        return null;
    }
};

module.exports = {
    findUser
};
