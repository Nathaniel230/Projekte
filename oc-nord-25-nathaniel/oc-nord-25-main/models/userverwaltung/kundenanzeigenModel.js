"use strict";

const mongoose = require('mongoose');

/**
 * Alle Kunden mit Sortierung abrufen
 * @param {string} sortBy - Sortierfeld: 'name', 'eintrittsdatum', 'ablaufdatum'
 * @param {string} sortOrder - Sortierreihenfolge: 'asc' (aufsteigend) oder 'desc' (absteigend)
 * @returns {Array} Sortierte Liste aller Kunden
 */
const getAllCustomersSorted = async (sortBy = 'eintrittsdatum', sortOrder = 'desc') => {
    try {
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        // Sortier-Objekt erstellen
        let sortObject = {};
        
        // Je nach sortBy das richtige Feld wählen
        if (sortBy === 'name') {
            sortObject.name = sortOrder === 'asc' ? 1 : -1;
        } else if (sortBy === 'eintrittsdatum') {
            sortObject.createdAt = sortOrder === 'asc' ? 1 : -1;
        } else if (sortBy === 'ablaufdatum') {
            // Ablaufdatum ist im subscriptionEndDate Feld
            sortObject.subscriptionEndDate = sortOrder === 'asc' ? 1 : -1;
        } else {
            // Standard: nach Eintrittsdatum absteigend
            sortObject.createdAt = -1;
        }
        
        // Kunden mit Sortierung abrufen
        const customers = await usersCollection.find({}).sort(sortObject).toArray();
        
        return customers;
    } catch (error) {
        console.error('Fehler beim Abrufen der Kunden:', error);
        return [];
    }
};

/**
 * Einen bestimmten Kunden per ID abrufen
 * @param {string} customerId - MongoDB ObjectId des Kunden
 * @returns {Object|null} Kunden-Objekt oder null
 */
const getCustomerById = async (customerId) => {
    try {
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        const customer = await usersCollection.findOne({
            _id: new mongoose.Types.ObjectId(customerId)
        });
        
        return customer;
    } catch (error) {
        console.error('Fehler beim Abrufen des Kunden:', error);
        return null;
    }
};

/**
 * Kundendaten aktualisieren
 * @param {string} customerId - MongoDB ObjectId des Kunden
 * @param {Object} customerData - Neue Kundendaten
 * @returns {boolean} true wenn erfolgreich, false bei Fehler
 */
const updateCustomerData = async (customerId, customerData) => {
    try {
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        // Update-Objekt erstellen
        const updateData = {
            updatedAt: new Date()
        };
        
        // Felder nur setzen, wenn sie vorhanden sind
        if (customerData.name) updateData.name = customerData.name;
        if (customerData.email) updateData.email = customerData.email;
        if (customerData.role) updateData.role = customerData.role;
        
        // Adressdaten
        if (customerData.StreetAndHousenumber) updateData.StreetAndHousenumber = customerData.StreetAndHousenumber;
        if (customerData.PLZ) updateData.PLZ = parseInt(customerData.PLZ);
        if (customerData.City) updateData.City = customerData.City;
        if (customerData.Country) updateData.Country = customerData.Country;
        
        // Website & Koordinaten
        if (customerData.URL) updateData.URL = customerData.URL;
        if (customerData.Coordinates_x !== undefined && customerData.Coordinates_x !== '') {
            updateData.Coordinates_x = parseFloat(customerData.Coordinates_x);
        }
        if (customerData.Coordinates_y !== undefined && customerData.Coordinates_y !== '') {
            updateData.Coordinates_y = parseFloat(customerData.Coordinates_y);
        }
        
        // Abonnement-Daten
        if (customerData.subscriptionStatus) updateData.subscriptionStatus = customerData.subscriptionStatus;
        if (customerData.subscriptionEndDate) updateData.subscriptionEndDate = new Date(customerData.subscriptionEndDate);
        
        // Bezahlt Status (Checkbox: "on" wenn angehakt, undefined wenn nicht)
        updateData.isPaid = customerData.isPaid === 'on';
        
        const result = await usersCollection.updateOne(
            { _id: new mongoose.Types.ObjectId(customerId) },
            { $set: updateData }
        );
        
        return result.modifiedCount > 0 || result.matchedCount > 0;
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Kundendaten:', error);
        return false;
    }
};

/**
 * Kunden löschen
 * @param {string} customerId - MongoDB ObjectId des Kunden
 * @returns {boolean} true wenn erfolgreich, false bei Fehler
 */
const deleteCustomer = async (customerId) => {
    try {
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        const result = await usersCollection.deleteOne({
            _id: new mongoose.Types.ObjectId(customerId)
        });
        
        return result.deletedCount > 0;
    } catch (error) {
        console.error('Fehler beim Löschen des Kunden:', error);
        return false;
    }
};

/**
 * iFrame-Status eines Kunden aktualisieren
 * @param {string} customerId - MongoDB ObjectId des Kunden
 * @param {boolean} iframeEnabled - Neuer Status (true = freischalten, false = sperren)
 * @returns {boolean} Erfolg der Operation
 */
const updateIframeStatus = async (customerId, iframeEnabled) => {
    try {
        const ObjectId = require('mongodb').ObjectId;
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        // Setze subscriptionStatus basierend auf iframeEnabled
        const updateData = {
            iframeEnabled: iframeEnabled,
            subscriptionStatus: iframeEnabled ? 'active' : 'blocked'
        };
        
        const result = await usersCollection.updateOne(
            { _id: new ObjectId(customerId) },
            { $set: updateData }
        );
        
        return result.modifiedCount > 0;
    } catch (error) {
        console.error('Fehler beim Aktualisieren des iFrame-Status:', error);
        return false;
    }
};

/**
 * iFrame-Status und Ablaufdatum aktualisieren (bei manueller Freischaltung)
 * @param {string} customerId - MongoDB ObjectId des Kunden
 * @param {boolean} iframeEnabled - Neuer Status (true = freischalten, false = sperren)
 * @param {Date} newEndDate - Neues Ablaufdatum (1 Jahr ab jetzt)
 * @returns {boolean} Erfolg der Operation
 */
const updateIframeStatusAndExpiry = async (customerId, iframeEnabled, newEndDate) => {
    try {
        const ObjectId = require('mongodb').ObjectId;
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        const result = await usersCollection.updateOne(
            { _id: new ObjectId(customerId) },
            { $set: { 
                iframeEnabled: iframeEnabled, 
                subscriptionEndDate: newEndDate,
                subscriptionStatus: 'active',
                isPaid: true
            } }
        );
        
        return result.modifiedCount > 0;
    } catch (error) {
        console.error('Fehler beim Aktualisieren des iFrame-Status und Ablaufdatums:', error);
        return false;
    }
};

module.exports = {
    getAllCustomersSorted,
    getCustomerById,
    updateCustomerData,
    deleteCustomer,
    updateIframeStatus,
    updateIframeStatusAndExpiry
};