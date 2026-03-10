# Stripe Checkout Integration - Anleitung


Die vollständige Stripe Checkout-Integration ist implementiert und umfasst:

### 1. Backend-Services
- **StripeService** (`services/stripeService.js`) - Vollständiger Service für Stripe-Operationen
- **ShopController** (`controllers/shop/shopController.js`) - Controller für Shop-Funktionalität
- **Models** für Produkte und Bestellungen in MongoDB
- **Routen** für alle Shop-Operationen

### 2. Frontend-Interface
- **Shop-Übersicht** (`/shop`) - Produktliste mit "Sofort kaufen" Buttons
- **Warenkorb** (`/shop/cart`) - Session-basierter Warenkorb
- **Erfolgs-/Abbruch-Seiten** für nach der Zahlung

### 3. Stripe Checkout Flow
- Klick auf "Sofort kaufen" oder "Zur Kasse" → Weiterleitung zu Stripe Checkout
- Stripe übernimmt komplette Zahlungsabwicklung
- Nach Zahlung: Weiterleitung zurück zur App (Erfolg/Abbruch)



### 1. Stripe API Keys korrigieren

Die API Keys in `config.env` sind derzeit abgeschnitten. Sie müssen diese ersetzen:

```env
# In config.env - Ersetzen Sie mit Ihren vollständigen Stripe Test-Keys:
STRIPE_PUBLISHABLE_KEY=pk_test_[VOLLSTÄNDIGER_KEY]
STRIPE_SECRET_KEY=sk_test_[VOLLSTÄNDIGER_KEY]
STRIPE_WEBHOOK_SECRET=whsec_[WEBHOOK_SECRET] # Optional für erweiterte Features
```

**Ihre Stripe Keys finden Sie:**
1. Gehen Sie zu https://dashboard.stripe.com/test/apikeys
2. Kopieren Sie die vollständigen Keys (nicht abgeschnitten)

### 2. Webhook konfigurieren (Optional)

Für erweiterte Features können Sie einen Webhook einrichten:
1. In Stripe Dashboard: Developers → Webhooks → Add endpoint
2. URL: `https://ihre-domain.com/webhook/stripe`
3. Events: `checkout.session.completed`, `payment_intent.succeeded`

## 🚀 Wie es funktioniert

### Für Endbenutzer:
1. Besuchen Sie `/shop` - Sehen Produktliste
2. Klick auf "Sofort kaufen" → Direkt zu Stripe Checkout
3. Oder: Produkte zum Warenkorb hinzufügen → Zur Kasse → Stripe Checkout
4. In Stripe: Kartendaten eingeben, bezahlen
5. Weiterleitung zurück zur App mit Bestätigung

### Technischer Ablauf:
1. **Frontend** sendet Produktdaten an `/shop/create-checkout-session`
2. **Backend** erstellt Stripe Checkout Session mit Produktdaten
3. **Frontend** leitet zu Stripe Checkout weiter
4. **Stripe** führt Zahlung durch
5. **Stripe** leitet zurück zu `/shop/success` oder `/shop/cancel`
6. **Backend** kann via Webhooks über Zahlungsstatus informiert werden

## 📁 Dateistruktur

```
├── services/
│   └── stripeService.js          # Stripe API-Integration
├── controllers/shop/
│   └── shopController.js         # Shop-Logik
├── models/shop/
│   ├── productModel.js           # Produkt-Datenmodell
│   └── orderModel.js             # Bestellungs-Datenmodell
├── views/shop/
│   ├── index.html                # Shop-Übersicht
│   ├── cart.html                 # Warenkorb
│   ├── success.html              # Erfolgreiche Zahlung
│   └── cancel.html               # Abgebrochene Zahlung
├── routes/index.js               # Shop-Routen
└── scripts/seedProducts.js       # Beispielprodukte einfügen
```

## 🧪 Testen

1. **Starten Sie den Server:**
   ```bash
   npm start
   ```

2. **Besuchen Sie den Shop:**
   - http://localhost:5500/shop

3. **Test-Kartendaten (Stripe):**
   - Kartennummer: `4242 4242 4242 4242`
   - Ablaufdatum: Beliebiges zukünftiges Datum
   - CVC: Beliebige 3 Ziffern
   - Postleitzahl: Beliebig

## ⚡ Nächste Schritte

1. **API Keys korrigieren** in `config.env`
2. **Server neu starten** nach Änderung der config.env
3. **Testen** mit Stripe Test-Kartendaten
4. **Produktionsdaten** hinzufügen oder Beispielprodukte anpassen

## 🔒 Sicherheit

- Alle Zahlungsdaten werden von Stripe verarbeitet (PCI-konform)
- Keine Kreditkartendaten berühren Ihren Server
- API Keys sind serverseitig geschützt
- HTTPS wird für Produktion empfohlen

## 📞 Support

Bei Fragen zur Stripe-Integration:
- Stripe Dokumentation: https://stripe.com/docs/checkout/quickstart
- Stripe Dashboard: https://dashboard.stripe.com/