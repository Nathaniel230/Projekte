"use strict";

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Funktion um User-Daten zu aktualisieren
const updateUserData = async (userId, userData) => {
    try {
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        // Nur Felder setzen, die auch Werte haben
        const updateData = {
            updatedAt: new Date()
        };
        
        // Pflichtfelder
        if (userData.name) updateData.name = userData.name;
        
        // Adressdaten
        if (userData.StreetAndHousenumber) updateData.StreetAndHousenumber = userData.StreetAndHousenumber;
        if (userData.PLZ) updateData.PLZ = parseInt(userData.PLZ);
        if (userData.City) updateData.City = userData.City;
        if (userData.Country) updateData.Country = userData.Country;
        
        // Website & Koordinaten
        if (userData.URL) updateData.URL = userData.URL;
        if (userData.Coordinates_x !== undefined && userData.Coordinates_x !== '') {
            updateData.Coordinates_x = parseFloat(userData.Coordinates_x);
        }
        if (userData.Coordinates_y !== undefined && userData.Coordinates_y !== '') {
            updateData.Coordinates_y = parseFloat(userData.Coordinates_y);
        }
        
        const result = await usersCollection.updateOne(
            { _id: new mongoose.Types.ObjectId(userId) },
            { $set: updateData }
        );
        
        return result.modifiedCount > 0 || result.matchedCount > 0;
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Benutzerdaten:', error);
        return false;
    }
};

// Funktion um Passwort zu ändern
const updatePassword = async (userId, currentPassword, newPassword) => {
    try {
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        // User finden
        const user = await usersCollection.findOne({ 
            _id: new mongoose.Types.ObjectId(userId) 
        });
        
        if (!user) {
            return { success: false, error: 'Benutzer nicht gefunden' };
        }
        
        // Aktuelles Passwort prüfen
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        
        if (!isPasswordValid) {
            return { success: false, error: 'Aktuelles Passwort ist falsch' };
        }
        
        // Neues Passwort hashen
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Passwort aktualisieren
        const result = await usersCollection.updateOne(
            { _id: new mongoose.Types.ObjectId(userId) },
            { $set: { password: hashedPassword, updatedAt: new Date() } }
        );
        
        return { success: result.modifiedCount > 0 };
    } catch (error) {
        console.error('Fehler beim Ändern des Passworts:', error);
        return { success: false, error: 'Serverfehler' };
    }
};

// Funktion um User mit ID zu laden
const getUserById = async (userId) => {
    try {
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        const user = await usersCollection.findOne({ 
            _id: new mongoose.Types.ObjectId(userId) 
        });
        
        return user;
    } catch (error) {
        console.error('Fehler beim Laden des Benutzers:', error);
        return null;
    }
};

/**
 * Aktualisiere das subscriptionEndDate eines Users
 * @param {string} userId - MongoDB ObjectId des Users
 * @param {Date} endDate - Neues Ablaufdatum (z.B. 1 Jahr ab Kauf)
 * @returns {boolean} Erfolg der Operation
 */
const updateSubscriptionEndDate = async (userId, endDate) => {
    try {
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        const result = await usersCollection.updateOne(
            { _id: new mongoose.Types.ObjectId(userId) },
            { $set: { subscriptionEndDate: endDate } }
        );
        
        return result.modifiedCount > 0;
    } catch (error) {
        console.error('Fehler beim Aktualisieren des subscriptionEndDate:', error);
        return false;
    }
};

/**
 * Aktiviere Abo für einen User nach erfolgreicher Zahlung
 * Setzt: subscriptionEndDate (1 Jahr), iframeEnabled (true), isPaid (true), subscriptionStatus (active)
 * @param {string} userId - MongoDB ObjectId des Users
 * @param {Date} endDate - Neues Ablaufdatum (z.B. 1 Jahr ab Kauf)
 * @returns {boolean} Erfolg der Operation
 */
const activateSubscriptionAfterPurchase = async (userId, endDate) => {
    try {
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        const result = await usersCollection.updateOne(
            { _id: new mongoose.Types.ObjectId(userId) },
            { 
                $set: { 
                    subscriptionEndDate: endDate,
                    iframeEnabled: true,
                    isPaid: true,
                    subscriptionStatus: 'active'
                } 
            }
        );
        
        return result.modifiedCount > 0 || result.matchedCount > 0;
    } catch (error) {
        console.error('Fehler beim Aktivieren des Abos:', error);
        return false;
    }
};

module.exports = {
    updateUserData,
    updatePassword,
    getUserById,
    updateSubscriptionEndDate,
    activateSubscriptionAfterPurchase
};
