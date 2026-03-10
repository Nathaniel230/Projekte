const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null // Für Gäste-Bestellungen
    },
    customerEmail: {
        type: String,
        required: true
    },
    customerName: {
        type: String,
        default: ''
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            default: null // Für Abonnements ohne explizites Product
        },
        name: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        totalPrice: {
            type: Number,
            required: true
        }
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'EUR'
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'cancelled', 'refunded', 'failed'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['stripe', 'paypal', 'bank_transfer'],
        default: 'stripe'
    },
    stripeSessionId: {
        type: String,
        default: null
    },
    stripePaymentIntentId: {
        type: String,
        default: null
    },
    stripeCustomerId: {
        type: String,
        default: null
    },
    fulfillmentStatus: {
        type: String,
        enum: ['unfulfilled', 'partial', 'fulfilled'],
        default: 'unfulfilled'
    },
    fulfillmentDate: {
        type: Date,
        default: null
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Indexes für bessere Performance
orderSchema.index({ userId: 1 });
orderSchema.index({ customerEmail: 1 });
orderSchema.index({ stripeSessionId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

// Virtual für formatierte Bestellnummer
orderSchema.virtual('formattedOrderId').get(function () {
    return `#${this.orderId}`;
});

// Methode um Bestellung als erfüllt zu markieren
orderSchema.methods.markAsFulfilled = function () {
    this.fulfillmentStatus = 'fulfilled';
    this.fulfillmentDate = new Date();
    return this.save();
};

// Static method um Bestellung anhand Stripe Session ID zu finden
orderSchema.statics.findByStripeSession = function (sessionId) {
    return this.findOne({ stripeSessionId: sessionId });
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;