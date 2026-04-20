const express = require('express');
const { engine } = require('express-handlebars');
var bodyParser = require('body-parser');
const session = require('express-session');
const dotenv = require('dotenv');

// Umgebungsvariablen laden
dotenv.config({ path: './config.env' });

const connectDB = require('./config/database');
const routing = require('./routes/index');

const app = express();

// DB Connection
connectDB();

//Middlewares
app.use(express.static('./public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Sessions
app.use(session({
    secret: 'mein-geheimer-schluessel',
    resave: false,
    saveUninitialized: false
}));

//Handlebars Config mit Helpers
app.engine('.html', engine({
    extname: '.html',
    helpers: {
        multiply: function (a, b) {
            return (a * b).toFixed(2);
        },
        eq: function (a, b) {
            return a === b;
        }
    }
}));
app.set('view engine', '.html');
app.set('views', './views');

//Routing
app.use('/', routing);

// Test Endpoint um Stripe-Konfiguration zu testen
app.get('/test-stripe', (req, res) => {
    const config = {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ? 'Konfiguriert' : 'Nicht konfiguriert',
        secretKey: process.env.STRIPE_SECRET_KEY ? 'Konfiguriert' : 'Nicht konfiguriert',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'Konfiguriert' : 'Nicht konfiguriert'
    };

    res.json({
        message: 'Stripe Configuration Test',
        config: config,
        environment: process.env.ENVIROMENT
    });
});

//Express-Server
const port = process.env.PORT || 5501;
app.listen(port, () => {
    console.log(`🚀 Server läuft auf Port ${port}`);
    console.log(`📱 Shop verfügbar unter: http://localhost:${port}/shop`);
    console.log(`🧪 Stripe-Test unter: http://localhost:${port}/test-stripe`);
});