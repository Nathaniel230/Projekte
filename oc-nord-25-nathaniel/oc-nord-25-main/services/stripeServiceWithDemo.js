let stripe = null;

class StripeService {

    constructor() {
        // Stripe erst initialisieren wenn benötigt
        this.initStripe();
    }

    initStripe() {
        if (!stripe && process.env.STRIPE_SECRET_KEY) {
            stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        } else if (!process.env.STRIPE_SECRET_KEY) {
            console.error('STRIPE_SECRET_KEY nicht in Umgebungsvariablen gefunden');
        }
    }

    getStripe() {
        if (!stripe) {
            this.initStripe();
        }
        return stripe;
    }

    /**
     * Erstellt eine Checkout Session für das vordefinierte Abonnement-Produkt
     * @param {string} successUrl - URL nach erfolgreichem Payment
     * @param {string} cancelUrl - URL bei abgebrochenem Payment
     * @param {string} userId - Optional: MongoDB User-ID für Zuordnung im Webhook
     * @returns {Promise<object>} Stripe Session
     */
    async createSubscriptionCheckoutSession(successUrl, cancelUrl, userId = null) {
        try {
            const stripeInstance = this.getStripe();
            if (!stripeInstance) {
                throw new Error('Stripe nicht konfiguriert');
            }

            const priceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID;
            if (!priceId) {
                throw new Error('Stripe Subscription Price ID nicht konfiguriert');
            }

            const sessionConfig = {
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: priceId, // Verwende die vordefinierte Price-ID
                        quantity: 1,
                    },
                ],
                mode: 'subscription',
                success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
                cancel_url: cancelUrl,
                billing_address_collection: 'required',
                subscription_data: {
                    metadata: {
                        product_id: process.env.STRIPE_SUBSCRIPTION_PRODUCT_ID || 'subscription',
                        source: 'website'
                    }
                },
                metadata: {
                    orderId: `subscription_${Date.now()}`,
                    source: 'website'
                }
            };
            
            // Füge User-ID hinzu, falls vorhanden
            if (userId) {
                sessionConfig.client_reference_id = userId.toString();
            }

            const session = await stripeInstance.checkout.sessions.create(sessionConfig);

            return session;
        } catch (error) {
            console.error('Fehler beim Erstellen der Subscription Checkout Session:', error);
            throw error;
        }
    }

    /**
     * Erstellt eine Stripe Checkout Session
     * @param {Array} items - Array von Produkten mit name, price, quantity, category
     * @param {string} successUrl - URL nach erfolgreichem Payment
     * @param {string} cancelUrl - URL bei abgebrochenem Payment
     * @returns {Promise<object>} Stripe Session
     */
    async createCheckoutSession(items, successUrl, cancelUrl) {
        try {
            const stripeInstance = this.getStripe();
            if (!stripeInstance) {
                throw new Error('Stripe nicht konfiguriert');
            }

            const lineItems = items.map(item => {
                const isSubscription = item.category === 'subscription';

                const priceData = {
                    currency: (item.currency || 'chf').toLowerCase(),
                    product_data: {
                        name: item.name,
                        description: item.description || '',
                    },
                    unit_amount: Math.round(item.price * 100), // Preis in Rappen/Cents
                };

                // Für Abonnements fügen wir recurring-Informationen hinzu
                if (isSubscription) {
                    priceData.recurring = {
                        interval: 'month',
                        interval_count: item.duration || 1
                    };
                }

                return {
                    price_data: priceData,
                    quantity: item.quantity || 1,
                };
            });

            // Bestimme den Modus basierend auf dem ersten Item
            const isSubscription = items[0] && items[0].category === 'subscription';

            const sessionConfig = {
                payment_method_types: ['card'],
                line_items: lineItems,
                mode: isSubscription ? 'subscription' : 'payment',
                success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
                cancel_url: cancelUrl,
                billing_address_collection: 'required',
                metadata: {
                    orderId: `order_${Date.now()}`,
                }
            };

            // customer_creation nur für payment mode
            if (!isSubscription) {
                sessionConfig.customer_creation = 'always';
            }

            // Für Abonnements zusätzliche Metadaten hinzufügen
            if (isSubscription) {
                sessionConfig.subscription_data = {
                    metadata: {
                        product_id: items[0]._id ? items[0]._id.toString() : 'subscription',
                        product_name: items[0].name
                    }
                };
            }

            const session = await stripeInstance.checkout.sessions.create(sessionConfig);

            return session;
        } catch (error) {
            console.error('Fehler beim Erstellen der Checkout Session:', error);
            throw error;
        }
    }

    /**
     * Erstellt einen Payment Intent für Custom Payment Flow
     * @param {number} amount - Betrag in Euro
     * @param {string} currency - Währung (default: eur)
     * @param {object} metadata - Zusätzliche Metadaten
     * @returns {Promise<object>} Payment Intent
     */
    async createPaymentIntent(amount, currency = 'eur', metadata = {}) {
        try {
            const stripeInstance = this.getStripe();
            if (!stripeInstance) {
                throw new Error('Stripe nicht konfiguriert');
            }

            const paymentIntent = await stripeInstance.paymentIntents.create({
                amount: Math.round(amount * 100), // Betrag in Cents
                currency: currency,
                metadata: metadata,
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            return paymentIntent;
        } catch (error) {
            console.error('Fehler beim Erstellen des Payment Intent:', error);
            throw error;
        }
    }

    /**
     * Ruft Informationen zu einer Checkout Session ab
     * @param {string} sessionId - Stripe Session ID
     * @returns {Promise<object>} Session Details
     */
    async getCheckoutSession(sessionId) {
        try {
            const stripeInstance = this.getStripe();
            if (!stripeInstance) {
                throw new Error('Stripe nicht konfiguriert');
            }

            const session = await stripeInstance.checkout.sessions.retrieve(sessionId, {
                expand: ['subscription', 'customer']
            });
            return session;
        } catch (error) {
            console.error('Fehler beim Abrufen der Session:', error);
            throw error;
        }
    }

    /**
     * Ruft Abonnement-Details ab
     * @param {string} subscriptionId - Stripe Subscription ID
     * @returns {Promise<object>} Subscription Details
     */
    async getSubscription(subscriptionId) {
        try {
            const stripeInstance = this.getStripe();
            if (!stripeInstance) {
                throw new Error('Stripe nicht konfiguriert');
            }

            const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId);
            return subscription;
        } catch (error) {
            console.error('Fehler beim Abrufen des Abonnements:', error);
            throw error;
        }
    }

    /**
     * Kündigt ein Abonnement
     * @param {string} subscriptionId - Stripe Subscription ID
     * @returns {Promise<object>} Cancelled Subscription
     */
    async cancelSubscription(subscriptionId) {
        try {
            const stripeInstance = this.getStripe();
            if (!stripeInstance) {
                throw new Error('Stripe nicht konfiguriert');
            }

            const subscription = await stripeInstance.subscriptions.update(subscriptionId, {
                cancel_at_period_end: true
            });
            return subscription;
        } catch (error) {
            console.error('Fehler beim Kündigen des Abonnements:', error);
            throw error;
        }
    }

    /**
     * Erstellt einen Kunden in Stripe
     * @param {object} customerData - Kundendaten (email, name, etc.)
     * @returns {Promise<object>} Stripe Customer
     */
    async createCustomer(customerData) {
        try {
            const stripeInstance = this.getStripe();
            if (!stripeInstance) {
                throw new Error('Stripe nicht konfiguriert');
            }

            const customer = await stripeInstance.customers.create({
                email: customerData.email,
                name: customerData.name || '',
                phone: customerData.phone || '',
                address: customerData.address || {},
            });

            return customer;
        } catch (error) {
            console.error('Fehler beim Erstellen des Kunden:', error);
            throw error;
        }
    }

    /**
     * Verifiziert Webhook-Signatur
     * @param {string} body - Request Body
     * @param {string} signature - Webhook Signature
     * @returns {object} Webhook Event
     */
    verifyWebhookSignature(body, signature) {
        try {
            const stripeInstance = this.getStripe();
            if (!stripeInstance) {
                throw new Error('Stripe nicht konfiguriert');
            }

            const event = stripeInstance.webhooks.constructEvent(
                body,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET
            );
            return event;
        } catch (error) {
            console.error('Webhook Signatur ungültig:', error);
            throw error;
        }
    }

    /**
     * Erstellt eine Rückerstattung
     * @param {string} paymentIntentId - Payment Intent ID
     * @param {number} amount - Rückerstattungsbetrag in Euro (optional)
     * @returns {Promise<object>} Refund
     */
    async createRefund(paymentIntentId, amount = null) {
        try {
            const stripeInstance = this.getStripe();
            if (!stripeInstance) {
                throw new Error('Stripe nicht konfiguriert');
            }

            const refundData = {
                payment_intent: paymentIntentId,
            };

            if (amount) {
                refundData.amount = Math.round(amount * 100); // Betrag in Cents
            }

            const refund = await stripeInstance.refunds.create(refundData);
            return refund;
        } catch (error) {
            console.error('Fehler beim Erstellen der Rückerstattung:', error);
            throw error;
        }
    }
}

module.exports = new StripeService();