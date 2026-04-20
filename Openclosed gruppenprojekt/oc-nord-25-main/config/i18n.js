const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');
const path = require('path');

i18next
    .use(Backend)
    .use(middleware.LanguageDetector)
    .init({
        backend: {
            loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json')
        },
        fallbackLng: 'de',
        preload: ['de', 'en', 'fr', 'it', 'es'],
        ns: ['common'],
        defaultNS: 'common',
        detection: {
            order: ['querystring', 'cookie', 'header'],
            caches: ['cookie'],
            lookupQuerystring: 'lng',
            lookupCookie: 'language',
            cookieSecure: false,
            cookieMaxAge: 365 * 24 * 60 * 60 * 1000 // 1 Jahr
        }
    });

module.exports = i18next;
