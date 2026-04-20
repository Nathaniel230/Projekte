"use strict";
const express = require('express'); //https://expressjs.com/ 
const { engine } = require('express-handlebars'); //engine MUSS engine heissen... https://www.npmjs.com/package/express-handlebars?activeTab=readme 
var bodyParser = require('body-parser'); //Formulardaten parsen https://www.npmjs.com/package/body-parser 
var http = require('http');
const session = require('express-session');

//Zusätzliche
var enforce = require('express-sslify'); //https://www.npmjs.com/package/express-sslify 
const dotenv = require('dotenv'); //https://www.npmjs.com/package/dotenv
dotenv.config({ path: './config.env' });

// i18n Configuration
const i18next = require('./config/i18n');
const i18nextMiddleware = require('i18next-http-middleware');

// Routing wird nach dotenv.config() geladen
const routing = require('./routes/index'); //Eigenes Routing-Modul. .js muss nicht angegeben werden

const connectDB = require('./config/database'); // neu
const cron = require('node-cron'); // Für geplante Aufgaben
const { runDailySubscriptionCheck } = require('./services/subscriptionReminderService'); // Subscription-Erinnerungen

//Start
const app = express();

// DB Connection - vor dem Server-Start
connectDB(); // neu

if (process.env.ENVIROMENT != "local") {
    app.use(enforce.HTTPS({ trustProtoHeader: true })); //http nach httpS rewriten
}

//Middlewares
app.use(express.static('./public')); //Statische Inhalte direkt ausliefern. /public/ in den Sites-Pfaden nicht angeben!

// Raw body für Stripe Webhooks (vor bodyParser)
app.use('/webhook/stripe', express.raw({ type: 'application/json' }));

app.use(bodyParser.urlencoded({ extended: false })); //Formulardaten parsen
app.use(bodyParser.json()); // JSON Body Parser für API-Requests

// Sessions hinzufügen
app.use(session({
    secret: 'mein-geheimer-schluessel',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: null
    }
}));

// Middleware um User-Info an alle Views zu übergeben
const { attachUser } = require('./middleware/authMiddleware');
app.use(attachUser);

// i18next Middleware
app.use(i18nextMiddleware.handle(i18next));

// Middleware um i18n-Funktion an res.locals zu übergeben
app.use((req, res, next) => {
    res.locals.t = req.t.bind(req);
    res.locals.language = req.language;
    res.locals.i18nLanguage = req.language; // Für Helper
    next();
});

//Handlebars Config mit Helpers
app.engine('.html', engine({
    extname: '.html',
    helpers: {
        multiply: function (a, b) {
            return (a * b).toFixed(2);
        },
        eq: function (a, b) {
            return a === b;
        },
        formatDate: function (date) {
            if (!date) return '-';
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}.${month}.${year}`;
        },
        formatDateInput: function (date) {
            if (!date) return '';
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        },
        isSubscriptionExpired: function (subscriptionEndDate) {
            if (!subscriptionEndDate) return false;
            const endDate = new Date(subscriptionEndDate);
            const today = new Date();
            // Setze die Zeit auf Mitternacht für einen fairen Vergleich
            today.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);
            return endDate < today;
        },
        t: function (key, options) {
            // Hole die Sprache aus dem root context
            const language = (options && options.data && options.data.root && options.data.root.i18nLanguage) || 'de';
            // Benutze die globale i18next Instanz mit der richtigen Sprache
            return i18next.t(key, { lng: language });
        }
    }
}));
app.set('view engine', '.html');
app.set('views', './views');

//Routing
app.use('/', routing); //Eigenes Routing-Modul mit allen Routes, das wiederum auf Controllers verweist

//Express-Server
const port = process.env.PORT || 5500;
app.listen(port, () => {
    console.log(`server is runing at port ${port}`)
});

// Cron-Job für Abonnement-Erinnerungen
// Läuft jede Minute (Produktiv gewünscht)
cron.schedule('* * * * *', async () => {
    console.log('⏰ Cron-Job gestartet: Abonnement-Prüfung');
    try {
        await runDailySubscriptionCheck();
    } catch (error) {
        console.error('❌ Fehler im Cron-Job:', error);
    }
}, {
    timezone: "Europe/Zurich" // Schweizer Zeitzone
});

console.log('✅ Cron-Job für Abonnement-Erinnerungen aktiviert (läuft jede Minute)');


