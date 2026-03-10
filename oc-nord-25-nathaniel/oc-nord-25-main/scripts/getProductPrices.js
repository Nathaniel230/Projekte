const dotenv = require('dotenv');
const stripe = require('stripe');

// Umgebungsvariablen laden
dotenv.config({ path: './config.env' });

async function getProductPrices() {
    try {
        const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

        const productId = 'prod_TP70IeArh51WvN';

        console.log('🔍 Suche Preise für Produkt:', productId);

        // Alle Preise für dieses Produkt abrufen
        const prices = await stripeClient.prices.list({
            product: productId,
            active: true
        });

        console.log('\n📋 Gefundene aktive Preise:');

        prices.data.forEach(price => {
            console.log(`\n💰 Price ID: ${price.id}`);
            console.log(`   Betrag: ${price.unit_amount / 100} ${price.currency.toUpperCase()}`);
            console.log(`   Typ: ${price.type}`);

            if (price.recurring) {
                console.log(`   Abrechnung: Alle ${price.recurring.interval_count} ${price.recurring.interval}(e)`);
            } else {
                console.log(`   Abrechnung: Einmalig`);
            }

            console.log(`   Aktiv: ${price.active}`);
            console.log(`   Erstellt: ${new Date(price.created * 1000).toLocaleDateString('de-DE')}`);
        });

        if (prices.data.length === 0) {
            console.log('\n⚠️ Keine aktiven Preise für dieses Produkt gefunden.');
            console.log('   Möglicherweise müssen Sie einen Preis in Stripe erstellen.');
        }

    } catch (error) {
        console.error('❌ Fehler beim Abrufen der Preise:', error.message);
    }
}

getProductPrices();