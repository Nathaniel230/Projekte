const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/shop/productModel');

// Umgebungsvariablen laden
dotenv.config({ path: '../config.env' });

async function updateProducts() {
    try {
        // Verbindung zur MongoDB herstellen
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/oc-info');
        console.log('Verbindung zur MongoDB hergestellt');

        // Alle bestehenden Produkte löschen
        const deleteResult = await Product.deleteMany({});
        console.log(`${deleteResult.deletedCount} alte Produkte gelöscht`);

        // Neues Abonnement-Produkt erstellen
        const subscriptionProduct = {
            name: 'Abonnement',
            description: 'Jährliches Abonnement mit Vollzugriff auf alle Features und Services',
            price: 67.67,
            currency: 'CHF', // Schweizer Franken
            category: 'subscription',
            duration: 1, // 1 Jahr
            features: [
                'Vollzugriff auf alle Features',
                'Support 24/7',
                'Erweiterte API-Limits',
                'Exklusive Inhalte und Updates',
                'Jederzeit kündbar'
            ],
            image: '/img/subscription.jpg',
            isActive: true,
            sortOrder: 1
        };

        // Produkt einfügen
        const product = await Product.create(subscriptionProduct);
        console.log('✅ Abonnement-Produkt erfolgreich erstellt:');
        console.log(`- ${product.name}: ${product.price} ${product.currency}`);
        console.log(`- ID: ${product._id}`);

    } catch (error) {
        console.error('Fehler beim Aktualisieren der Produkte:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Datenbankverbindung geschlossen');
    }
}

updateProducts();