"use strict";

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Funktion um User anhand E-Mail zu finden
const findUserByEmail = async (email) => {
    try {
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        const user = await usersCollection.findOne({ email: email });
        return user;
    } catch (error) {
        console.error('Fehler beim Suchen des Benutzers:', error);
        return null;
    }
};

// Funktion um neuen User zu erstellen
const createUser = async (userData) => {
    try {
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        // Passwort hashen mit bcrypt (10 Runden)
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        // User-Objekt erstellen
        const newUser = {
            name: userData.name,
            email: userData.email,
            password: hashedPassword, // Gehashtes Passwort speichern
            createdAt: new Date(),
            isActive: true,
            isAdmin: userData.isAdmin || false // Admin-Flag, default ist false
        };
        
        // User in Datenbank speichern
        const result = await usersCollection.insertOne(newUser);
        
        if (result.insertedId) {
            // User mit der neuen ID zurückgeben
            newUser._id = result.insertedId;
            return newUser;
        }
        
        return null;
    } catch (error) {
        console.error('Fehler beim Erstellen des Benutzers:', error);
        return null;
    }
};

module.exports = {
    findUserByEmail,
    createUser
};
