"use strict";

const mongoose = require('mongoose');

// Alle Kunden (User) abrufen
const getAllCustomers = async () => {
    try {
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        const customers = await usersCollection.find({}).sort({ createdAt: -1 }).toArray();
        return customers;
    } catch (error) {
        console.error('Fehler beim Abrufen der Kunden:', error);
        return [];
    }
};

// Alle Bestellungen abrufen - nur Abonnements
const getAllOrders = async () => {
    try {
        const db = mongoose.connection.db;
        const ordersCollection = db.collection('orders');
        
        // Filter: Nur Abonnements (type = 'subscription' oder items mit name 'Abo/Abonnement')
        const orders = await ordersCollection.find({
            $or: [
                { type: 'subscription' },
                { 'items.name': { $regex: 'Abonnement|Abo|subscription', $options: 'i' } }
            ]
        }).sort({ createdAt: -1 }).toArray();
        return orders;
    } catch (error) {
        console.error('Fehler beim Abrufen der Bestellungen:', error);
        return [];
    }
};

// Statistiken abrufen
const getStatistics = async () => {
    try {
        const db = mongoose.connection.db;
        
        // Anzahl User
        const usersCount = await db.collection('users').countDocuments();
        
        // Anzahl Bestellungen (nur Abonnements)
        const ordersCount = await db.collection('orders').countDocuments({ 
            $or: [
                { type: 'subscription' },
                { 'items.name': { $regex: 'Abonnement|Abo|subscription', $options: 'i' } }
            ]
        });
        
        // Anzahl aktiver Abonnements (wenn vorhanden)
        const subscriptionsCount = await db.collection('orders').countDocuments({ 
            $or: [
                { type: 'subscription', status: 'active' },
                { 'items.name': { $regex: 'Abonnement|Abo|subscription', $options: 'i' }, status: 'active' }
            ]
        });
        
        // Gesamtumsatz berechnen (nur Abonnements)
        const orders = await db.collection('orders').find({
            $or: [
                { type: 'subscription' },
                { 'items.name': { $regex: 'Abonnement|Abo|subscription', $options: 'i' } }
            ]
        }).toArray();
        const totalRevenue = orders.reduce((sum, order) => sum + (order.amount || order.totalAmount || 0), 0);
        
        return {
            usersCount,
            ordersCount,
            subscriptionsCount,
            totalRevenue: totalRevenue.toFixed(2)
        };
    } catch (error) {
        console.error('Fehler beim Abrufen der Statistiken:', error);
        return {
            usersCount: 0,
            ordersCount: 0,
            subscriptionsCount: 0,
            totalRevenue: '0.00'
        };
    }
};

// Einzelne Bestellung abrufen
const getOrderById = async (orderId) => {
    try {
        const db = mongoose.connection.db;
        const ordersCollection = db.collection('orders');
        const ObjectId = require('mongodb').ObjectId;
        
        const order = await ordersCollection.findOne({
            _id: new ObjectId(orderId)
        });
        
        return order;
    } catch (error) {
        console.error('Fehler beim Abrufen der Bestellung:', error);
        return null;
    }
};

module.exports = {
    getAllCustomers,
    getAllOrders,
    getStatistics,
    getOrderById
};
