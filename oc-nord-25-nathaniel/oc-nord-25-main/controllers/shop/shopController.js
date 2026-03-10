const stripeService = require('../../services/stripeServiceWithDemo');
const Product = require('../../models/shop/productModel');
const Order = require('../../models/shop/orderModel');
const mailService = require('../../services/mailService');

class ShopController {

    /**
     * Zeigt die Shop-Übersichtsseite - Weiterleitung zur Abonnement-Seite
     */
    async index(req, res) {
        try {
            // Da wir nur ein Abonnement-Produkt haben, leiten wir direkt zur Subscription-Seite weiter
            res.redirect('/shop/subscription');
        } catch (error) {
            console.error('Fehler beim Laden des Shops:', error);
            res.status(500).send('Serverfehler');
        }
    }

    /**
     * Zeigt die Abonnement-Seite
     */
    async subscription(req, res) {
        try {
            // Hole das Abonnement-Produkt aus der Datenbank
            let subscriptionProduct = null;
            let hasActiveSubscription = false;

            // Prüfen, ob der eingeloggte User bereits ein bezahltes Abo hat
            if (req.session.user?._id) {
                try {
                    const existingOrder = await Order.findOne({
                        userId: req.session.user._id,
                        status: 'paid'
                    }).lean();
                    hasActiveSubscription = !!existingOrder;
                } catch (subCheckErr) {
                    console.warn('Konnte bestehenden Auftrag nicht prüfen:', subCheckErr.message);
                }
            }

            try {
                subscriptionProduct = await Product.findOne({
                    category: 'subscription',
                    isActive: true
                });
            } catch (dbError) {
                console.log('Datenbank nicht verfügbar, verwende Demo-Daten:', dbError.message);
            }

            // Falls kein Produkt gefunden wurde, verwende Standardwerte
            if (!subscriptionProduct) {
                subscriptionProduct = {
                    _id: 'subscription_demo',
                    name: 'Abonnement',
                    description: 'Jährliches Abonnement mit Vollzugriff auf alle Features und Services',
                    price: 67.67,
                    currency: 'CHF',
                    category: 'subscription',
                    duration: 1,
                    features: [
                        'Vollzugriff auf alle Features',
                        'Support 24/7',
                        'Erweiterte API-Limits',
                        'Exklusive Inhalte und Updates',
                        'Jährliche Laufzeit - jederzeit kündbar'
                    ],
                    isActive: true
                };
            }

            res.render('shop/subscription', {
                product: subscriptionProduct,
                stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
                isLoggedIn: req.session.loggedIn,
                user: req.session.user,
                hasActiveSubscription,
                t: req.t,
                language: req.language
            });

        } catch (error) {
            console.error('Fehler beim Laden der Abonnement-Seite:', error);
            res.status(500).send('Serverfehler');
        }
    }

    /**
     * Erstellt Stripe Checkout Session für das Abonnement
     */
    async createSubscriptionCheckout(req, res) {
        try {
            // Stripe fügt automatisch ?session_id=... hinzu
            // Die Sprache wird aus dem Cookie gelesen (i18next macht das automatisch)
            const successUrl = `${req.protocol}://${req.get('host')}/shop/subscription-success`;
            const cancelUrl = `${req.protocol}://${req.get('host')}/shop/subscription`;

            console.log('Erstelle Subscription Checkout Session...');
            
            // Übergebe User-ID falls eingeloggt
            const userId = req.session.user?._id || null;
            const session = await stripeService.createSubscriptionCheckoutSession(successUrl, cancelUrl, userId);

            console.log('Checkout Session erstellt:', session.id);

            res.json({
                success: true,
                sessionId: session.id,
                url: session.url
            });

        } catch (error) {
            console.error('Fehler beim Erstellen der Subscription Checkout Session:', error);
            res.status(500).json({
                success: false,
                error: 'Fehler beim Erstellen der Checkout Session'
            });
        }
    }

    /**
     * Zeigt die Erfolgsseite nach erfolgreicher Zahlung
     */
    async subscriptionSuccess(req, res) {
        try {
            const sessionId = req.query.session_id;
            let session = null;

            if (sessionId) {
                try {
                    // Hole Session Details von Stripe
                    session = await stripeService.getCheckoutSession(sessionId);
                    console.log('Session Details erhalten:', session.id);

                    // Fallback: Speichere Bestellung auch hier, falls Webhook nicht funktioniert
                    try {
                        console.log('🔍 Debug - Session Payment Status:', session.payment_status);
                        console.log('🔍 Debug - Session Status:', session.status);

                        const existingOrder = await Order.findByStripeSession(session.id);
                        console.log('🔍 Debug - Existing Order:', existingOrder ? 'Ja' : 'Nein');

                        if (!existingOrder && (session.payment_status === 'paid' || session.status === 'complete')) {
                            const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

                            const newOrder = new Order({
                                orderId: orderId,
                                userId: req.session.user?._id || null,
                                customerEmail: session.customer_details?.email || session.customer_email,
                                customerName: session.customer_details?.name || '',
                                items: [{
                                    productId: null,
                                    name: 'Jährliches Abonnement',
                                    price: 67.67,
                                    quantity: 1,
                                    totalPrice: 67.67
                                }],
                                totalAmount: 67.67,
                                currency: 'CHF',
                                status: 'paid',
                                paymentMethod: 'stripe',
                                stripeSessionId: session.id,
                                stripePaymentIntentId: session.payment_intent,
                                stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
                                fulfillmentStatus: 'fulfilled',
                                fulfillmentDate: new Date(),
                                notes: 'Subscription erfolgreich aktiviert (Fallback)'
                            });

                            await newOrder.save();
                            console.log('✅ Bestellung gespeichert (Fallback):', orderId);
                            await mailService.sendOrderConfirmation(newOrder);
                        } else {
                            console.log('⚠️ Bestellung nicht gespeichert - Grund:',
                                existingOrder ? 'Existiert bereits' : 'Payment Status nicht "paid" oder "complete"');
                        }
                    } catch (orderError) {
                        console.error('❌ Fehler beim Speichern der Bestellung (Fallback):', orderError.message);
                    }

                } catch (error) {
                    console.log('Fehler beim Abrufen der Session Details:', error.message);
                }
            }

            // Wenn User eingeloggt ist, aktiviere das Abo vollständig (1 Jahr ab Kauf)
            if (req.session.user && req.session.user._id && session && session.payment_status === 'paid') {
                try {
                    const endDate = new Date();
                    endDate.setFullYear(endDate.getFullYear() + 1); // 1 Jahr ab heute
                    
                    const userModel = require('../../models/userverwaltung/userModel');
                    await userModel.activateSubscriptionAfterPurchase(req.session.user._id, endDate);
                    console.log('✅ Abo für User vollständig aktiviert (iframeEnabled=true, isPaid=true, subscriptionStatus=active):', endDate);
                    
                    // Update Session
                    req.session.user.subscriptionEndDate = endDate;
                    req.session.user.iframeEnabled = true;
                    req.session.user.isPaid = true;
                    req.session.user.subscriptionStatus = 'active';
                } catch (userUpdateError) {
                    console.error('❌ Fehler beim Aktivieren des Abos:', userUpdateError);
                }
            }

            // Render Success-Seite
            res.render('shop/subscription-success', {
                session: session,
                sessionId: sessionId,
                amount: 67.67,
                currency: 'CHF',
                isLoggedIn: req.session.loggedIn,
                user: req.session.user,
                t: req.t,
                language: req.language
            });

        } catch (error) {
            console.error('Fehler beim Laden der Success-Seite:', error);
            res.status(500).send('Fehler beim Laden der Erfolgsseite');
        }
    }

    /**
     * Webhook für Stripe Events
     */
    async stripeWebhook(req, res) {
        const sig = req.headers['stripe-signature'];

        try {
            const event = stripeService.verifyWebhookSignature(req.body, sig);

            // Handle verschiedene Event Types
            switch (event.type) {
                case 'checkout.session.completed':
                    const session = event.data.object;
                    console.log('Zahlung abgeschlossen:', session.id);

                    // Shop History Integration - Bestellung speichern
                    try {
                        // Prüfe ob Bestellung bereits existiert
                        const existingOrder = await Order.findByStripeSession(session.id);

                        if (!existingOrder) {
                            // Generiere eindeutige Order-ID
                            const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

                            // Erstelle neue Bestellung
                            const newOrder = new Order({
                                orderId: orderId,
                                userId: session.client_reference_id || null, // Falls User-ID übergeben wurde
                                customerEmail: session.customer_details?.email || session.customer_email,
                                customerName: session.customer_details?.name || '',
                                items: [{
                                    productId: null, // Subscription hat keine feste Product-ID
                                    name: 'Jährliches Abonnement',
                                    price: 67.67,
                                    quantity: 1,
                                    totalPrice: 67.67
                                }],
                                totalAmount: 67.67,
                                currency: 'CHF',
                                status: 'paid',
                                paymentMethod: 'stripe',
                                stripeSessionId: session.id,
                                stripePaymentIntentId: session.payment_intent,
                                stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
                                fulfillmentStatus: 'fulfilled',
                                fulfillmentDate: new Date(),
                                notes: 'Subscription erfolgreich aktiviert'
                            });

                            await newOrder.save();
                            console.log('✅ Bestellung gespeichert:', orderId);
                            await mailService.sendOrderConfirmation(newOrder);
                            
                            // Aktiviere das Abo für den User (falls userId vorhanden)
                            if (session.client_reference_id) {
                                try {
                                    const endDate = new Date();
                                    endDate.setFullYear(endDate.getFullYear() + 1);
                                    const userModel = require('../../models/userverwaltung/userModel');
                                    await userModel.activateSubscriptionAfterPurchase(session.client_reference_id, endDate);
                                    console.log('✅ Abo für User aktiviert via Webhook (iframeEnabled=true, isPaid=true, subscriptionStatus=active)');
                                } catch (userUpdateError) {
                                    console.error('❌ Fehler beim Aktivieren des Abos im Webhook:', userUpdateError);
                                }
                            }
                        } else {
                            console.log('ℹ️ Bestellung existiert bereits:', existingOrder.orderId);
                        }
                    } catch (orderError) {
                        console.error('❌ Fehler beim Speichern der Bestellung:', orderError);
                    }
                    break;

                case 'payment_intent.succeeded':
                    const paymentIntent = event.data.object;
                    console.log('Payment Intent erfolgreich:', paymentIntent.id);
                    break;

                case 'payment_intent.payment_failed':
                    const failedPayment = event.data.object;
                    console.log('Zahlung fehlgeschlagen:', failedPayment.id);
                    break;

                default:
                    console.log('Unbehandelter Event Type:', event.type);
            }

            res.json({ received: true });

        } catch (error) {
            console.error('Webhook Fehler:', error);
            res.status(400).send('Webhook Fehler');
        }
    }

    // Legacy-Methoden für Kompatibilität
    async paymentSuccess(req, res) {
        return this.subscriptionSuccess(req, res);
    }

    async paymentCancel(req, res) {
        res.render('shop/cancel', {
            isLoggedIn: req.session.loggedIn,
            user: req.session.user
        });
    }

    // Placeholder für weitere Methoden
    async cart(req, res) {
        res.redirect('/shop/subscription');
    }

    async addToCart(req, res) {
        res.json({ success: false, message: 'Cart nicht verfügbar - nutzen Sie Direktkauf' });
    }

    async removeFromCart(req, res) {
        res.json({ success: false, message: 'Cart nicht verfügbar' });
    }

    async createCheckoutSession(req, res) {
        return this.createSubscriptionCheckout(req, res);
    }

    async createPaymentIntent(req, res) {
        res.status(501).json({ error: 'Payment Intent nicht implementiert' });
    }
}

module.exports = new ShopController();