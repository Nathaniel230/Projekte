const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/shop/productModel');

// Umgebungsvariablen laden
dotenv.config({ path: '../config.env' });

// Beispielprodukte
const sampleProducts = [
    {
        name: 'Premium Mitgliedschaft',
        description: '12 Monate Premium-Zugang mit allen Features, Priority Support und exklusiven Inhalten',
        price: 99.99,
        currency: 'EUR',
        category: 'membership',
        duration: 12,
        features: [
            'Alle Premium-Features',
            'Priority Support',
            'Exklusive Inhalte',
            'Erweiterte Konfiguration',
            'API-Zugang'
        ],
        image: '/img/premium.jpg',
        isActive: true,
        sortOrder: 1
    },
    {
        name: 'Standard Mitgliedschaft',
        description: '6 Monate Standard-Zugang mit den wichtigsten Features für den täglichen Gebrauch',
        price: 59.99,
        currency: 'EUR',
        category: 'membership',
        duration: 6,
        features: [
            'Wichtigste Features',
            'Standard Support',
            'Basis-Konfiguration',
            'Wöchentliche Updates'
        ],
        image: '/img/standard.jpg',
        isActive: true,
        sortOrder: 2
    },
    {
        name: 'Basic Mitgliedschaft',
        description: '3 Monate Basic-Zugang - perfekt für Einsteiger und zum Ausprobieren',
        price: 29.99,
        currency: 'EUR',
        category: 'membership',
        duration: 3,
        features: [
            'Grundlegende Features',
            'Community Support',
            'Basis-Setup',
            'Monatliche Updates'
        ],
        image: '/img/basic.jpg',
        isActive: true,
        sortOrder: 3
    },
    {
        name: 'Extended Support Add-on',
        description: 'Erweiterten 24/7 Support für 6 Monate',
        price: 19.99,
        currency: 'EUR',
        category: 'addon',
        duration: 6,
        features: [
            '24/7 Priority Support',
            'Telefon-Support',
            'Persönlicher Ansprechpartner',
            'Response-Zeit unter 2h'
        ],
        image: '/img/support.jpg',
        isActive: true,
        sortOrder: 4
    },
    {
        name: 'Custom Integration Service',
        description: 'Professionelle Integration und Setup-Service',
        price: 149.99,
        currency: 'EUR',
        category: 'service',
        features: [
            'Professionelle Installation',
            'Custom Konfiguration',
            'Integration in bestehende Systeme',
            '3 Monate Support inklusive'
        ],
        image: '/img/integration.jpg',
        isActive: true,
        sortOrder: 5
    }
];

async function seedProducts() {
    try {
        // Verbindung zur MongoDB herstellen
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/oc-info');
        console.log('Verbindung zur MongoDB hergestellt');

        // Prüfen ob bereits Produkte vorhanden sind
        const existingProducts = await Product.countDocuments();

        if (existingProducts > 0) {
            console.log(`${existingProducts} Produkte bereits vorhanden. Überspringe Seeding.`);
            console.log('Verwende --force um alle Produkte zu ersetzen');
            return;
        }

        // Beispielprodukte einfügen
        await Product.insertMany(sampleProducts);
        console.log(`${sampleProducts.length} Beispielprodukte erfolgreich eingefügt`);

        // Eingefügte Produkte anzeigen
        const products = await Product.find().sort({ sortOrder: 1 });
        console.log('\nEingefügte Produkte:');
        products.forEach(product => {
            console.log(`- ${product.name}: ${product.price}€ (${product.category})`);
        });

    } catch (error) {
        console.error('Fehler beim Seeding:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Datenbankverbindung geschlossen');
    }
}

async function clearAndSeed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/oc-info');
        console.log('Verbindung zur MongoDB hergestellt');

        // Alle Produkte löschen
        const deleteResult = await Product.deleteMany({});
        console.log(`${deleteResult.deletedCount} Produkte gelöscht`);

        // Neue Produkte einfügen
        await Product.insertMany(sampleProducts);
        console.log(`${sampleProducts.length} neue Produkte eingefügt`);

    } catch (error) {
        console.error('Fehler beim Reset:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Datenbankverbindung geschlossen');
    }
}

// Command line arguments verarbeiten
const args = process.argv.slice(2);
const forceReset = args.includes('--force') || args.includes('-f');

if (forceReset) {
    console.log('Force-Modus: Alle Produkte werden ersetzt...');
    clearAndSeed();
} else {
    seedProducts();
}

module.exports = { sampleProducts, seedProducts, clearAndSeed };