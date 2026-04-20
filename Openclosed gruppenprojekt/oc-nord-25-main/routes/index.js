"use strict";
const express = require('express');
const path = require('path');
const router = express.Router();

const homeController = require('../controllers/configIframe/homeController'); //.js muss nicht angegeben werden
const aboutController = require('../controllers/configIframe/aboutController');
const configServerController = require('../controllers/configIframe/configServerController');
const weekController = require('../controllers/configIframe/weekController');
const loginController = require('../controllers/userverwaltung/loginController');
const registrationController = require('../controllers/userverwaltung/registrationController');
const userController = require('../controllers/userverwaltung/userController');
const adminController = require('../controllers/userverwaltung/adminController');
const kundenanzeigeController = require('../controllers/userverwaltung/kundenanzeige');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// Shop Controller wird verzögert geladen, damit dotenv zuerst ausgeführt werden kann
let shopController = null;
function getShopController() {
    if (!shopController) {
        shopController = require('../controllers/shop/shopController');
    }
    return shopController;
}

router.get('/', (req, res) => { //Home Site
    homeController.renderHome(req, res);
});

router.get('/homeIframe', (req, res) => { //Home Iframe
    res.render('homeIframe', {
        t: req.t.bind(req),
        language: req.language
    });
});

router.get('/homeIframe2', (req, res) => { //Home Iframe 2
    res.render('homeIframe2', {
        t: req.t.bind(req),
        language: req.language
    });
});

router.get('/about', (req, res) => { //About Site
    aboutController.renderAbout(req, res);
});

router.get('/configIframe/config_Iframe', requireAuth, (req, res) => { //Config Iframe Page
    configServerController.renderConfig(req, res);
});

// API Routes für iFrame-Konfiguration
router.get('/api/iframe/settings', (req, res) => {
    configServerController.getSettings(req, res);
});

router.post('/api/iframe/settings', (req, res) => {
    configServerController.saveSettings(req, res);
});

// API Routes für Ausserplanmässig
router.get('/api/iframe/outofplan', (req, res) => {
    configServerController.getOutofplanEntries(req, res);
});

router.post('/api/iframe/outofplan', (req, res) => {
    configServerController.saveOutofplanEntry(req, res);
});

router.delete('/api/iframe/outofplan/:id', (req, res) => {
    configServerController.deleteOutofplanEntry(req, res);
});

router.get('/wochenplan', requireAuth, (req, res) => { //Wochenplan Editor Page
    weekController.renderWochenplan(req, res);
});

// Public API for Iframe
router.get('/api/public/week/current', weekController.getPublicCurrentWeek);

// API Routes for Week Editor
router.get('/api/week/decoupled', requireAuth, weekController.getDecoupledWeeks);
router.post('/api/week/standard', requireAuth, weekController.saveStandardWeek);
router.get('/api/week/special-days', requireAuth, weekController.getSpecialDays);
router.post('/api/week/special-days', requireAuth, weekController.saveSpecialDays);
router.get('/api/week/:year/:week', requireAuth, weekController.getWeek);
router.post('/api/week/:year/:week', requireAuth, weekController.saveWeek);

// Test iFrame Routes
router.get('/test-iframe1', (req, res) => { //Test iFrame 1 - Geschlossen
    res.sendFile(path.join(__dirname, '../views/testIframe1.html'));
});

router.get('/test-iframe2', (req, res) => { //Test iFrame 2 - Geöffnet
    res.sendFile(path.join(__dirname, '../views/testIframe2.html'));
});

router.get('/test-iframe3', (req, res) => { //Test iFrame 3 - Einbettung
    res.sendFile(path.join(__dirname, '../views/testIframe3.html'));
});

// Login Routes
router.get('/login', (req, res) => { //Login-Seite anzeigen
    loginController.renderLogin(req, res);
});

router.post('/login', (req, res) => { //Login-Daten verarbeiten
    loginController.processLogin(req, res);
});

router.get('/logout', (req, res) => { //Abmelden
    loginController.logout(req, res);
});

// Registration Routes
router.get('/register', (req, res) => { //Registrierungs-Seite anzeigen
    registrationController.renderRegister(req, res);
});

router.post('/register', (req, res) => { //Registrierungs-Daten verarbeiten
    registrationController.processRegister(req, res);
});

// User Dashboard Routes
router.get('/user/datenverwaltung', (req, res) => { //Datenverwaltung anzeigen
    userController.renderDatenverwaltung(req, res);
});

router.post('/user/datenverwaltung', (req, res) => { //Datenverwaltung speichern
    userController.updateDatenverwaltung(req, res);
});

router.get('/user/iframe-config', (req, res) => { //iFrame Konfiguration
    userController.renderIframeConfig(req, res);
});

router.get('/user/bestellhistorie', requireAuth, (req, res) => { //Bestellhistorie
    userController.renderBestellhistorie(req, res);
});

// Admin Routes (nur für Admins zugänglich)
router.get('/admin/kundenanzeige', requireAdmin, (req, res) => { //Kundenanzeige mit Sortierung
    kundenanzeigeController.renderKundenanzeige(req, res);
});

router.get('/admin/kundenanzeige/edit/:id', requireAdmin, (req, res) => { //Kunde bearbeiten - Seite anzeigen
    kundenanzeigeController.renderEditKunde(req, res);
});

router.post('/admin/kundenanzeige/edit/:id', requireAdmin, (req, res) => { //Kunde bearbeiten - Daten speichern
    kundenanzeigeController.updateKunde(req, res);
});

router.post('/admin/kundenanzeige/delete/:id', requireAdmin, (req, res) => { //Kunde löschen
    kundenanzeigeController.deleteKunde(req, res);
});

router.post('/admin/kundenanzeige/toggle-iframe/:id', requireAdmin, (req, res) => { //iFrame-Status umschalten
    kundenanzeigeController.toggleIframeStatus(req, res);
});

router.get('/admin/rechnungen', requireAdmin, (req, res) => { //Rechnungen
    adminController.renderRechnungen(req, res);
});

router.get('/admin/rechnungen/:id', requireAdmin, (req, res) => { //Rechnung Detail anzeigen
    adminController.renderRechnung(req, res);
});

router.get('/admin/statistiken', requireAdmin, (req, res) => { //Statistiken
    adminController.renderStatistiken(req, res);
});

// Shop Routes
router.get('/shop', (req, res) => { //Shop-Übersicht
    getShopController().index(req, res);
});

router.get('/shop/cart', (req, res) => { //Warenkorb
    getShopController().cart(req, res);
});

router.post('/shop/add-to-cart', (req, res) => { //Zum Warenkorb hinzufügen
    getShopController().addToCart(req, res);
});

router.post('/shop/remove-from-cart', (req, res) => { //Aus Warenkorb entfernen
    getShopController().removeFromCart(req, res);
});

router.post('/shop/create-checkout-session', (req, res) => { //Stripe Checkout Session erstellen
    getShopController().createCheckoutSession(req, res);
});

router.post('/shop/create-payment-intent', (req, res) => { //Payment Intent für Custom Flow
    getShopController().createPaymentIntent(req, res);
});

// Abonnement-spezifische Routen (erfordert Login)
router.get('/shop/subscription', requireAuth, (req, res) => { // Abonnement-Seite
    getShopController().subscription(req, res);
});

router.post('/shop/create-subscription-checkout', requireAuth, (req, res) => { // Abonnement-Checkout erstellen
    getShopController().createSubscriptionCheckout(req, res);
});

router.get('/shop/subscription-success', (req, res) => { // Erfolgreiche Abonnement-Zahlung
    getShopController().subscriptionSuccess(req, res);
});

router.get('/shop/success', (req, res) => { //Erfolgreiche Zahlung
    getShopController().paymentSuccess(req, res);
});

router.get('/shop/cancel', (req, res) => { //Abgebrochene Zahlung
    getShopController().paymentCancel(req, res);
});

router.get('/shop/demo-payment', (req, res) => { //Demo-Zahlungsseite
    res.render('shop/demo-payment');
});

// Stripe Webhook (muss raw body haben)
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), (req, res) => {
    getShopController().stripeWebhook(req, res);
});

// Test-Route für Abonnement-Erinnerungen (nur für Entwicklung/Testing)
router.get('/test-subscription-reminders', async (req, res) => {
    try {
        const { runDailySubscriptionCheck } = require('../services/subscriptionReminderService');
        console.log('\n🧪 Manueller Test der Abonnement-Erinnerungen gestartet...\n');
        await runDailySubscriptionCheck();
        res.send(`
            <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Test Abonnement-Erinnerungen</title>
                    <style>
                        body { font-family: Arial; padding: 40px; background: #f5f5f5; }
                        .container { background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        h1 { color: #667eea; }
                        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 4px; margin: 20px 0; }
                        .info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 4px; margin: 20px 0; }
                        pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; }
                        a { color: #667eea; text-decoration: none; }
                        a:hover { text-decoration: underline; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>✅ Test abgeschlossen</h1>
                        <div class="success">
                            <strong>Die Abonnement-Prüfung wurde ausgeführt!</strong>
                        </div>
                        <div class="info">
                            <strong>📊 Details in der Server-Konsole</strong><br><br>
                            Bitte prüfe die Server-Konsole für detaillierte Informationen über:
                            <ul>
                                <li>Anzahl gefundener Benutzer</li>
                                <li>Versendete E-Mails</li>
                                <li>Eventuelle Fehler</li>
                            </ul>
                        </div>
                        <h3>🧪 Testen mit manuellen Daten:</h3>
                        <p>Um das System zu testen, erstelle einen Benutzer in der Datenbank mit:</p>
                        <pre>subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)</pre>
                        <p>Für 30 Tage, oder:</p>
                        <pre>subscriptionEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)</pre>
                        <p>Für 7 Tage.</p>
                        <p><a href="/test-subscription-reminders">🔄 Erneut testen</a> | <a href="/">🏠 Zur Startseite</a></p>
                    </div>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('❌ Fehler beim manuellen Test:', error);
        res.status(500).send(`
            <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Fehler</title>
                    <style>
                        body { font-family: Arial; padding: 40px; background: #f5f5f5; }
                        .container { background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 4px; }
                        pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>❌ Fehler</h1>
                        <div class="error">
                            <strong>Es ist ein Fehler aufgetreten:</strong><br><br>
                            <pre>${error.message}</pre>
                        </div>
                        <p><a href="/test-subscription-reminders">🔄 Erneut versuchen</a></p>
                    </div>
                </body>
            </html>
        `);
    }
});

module.exports = router;
