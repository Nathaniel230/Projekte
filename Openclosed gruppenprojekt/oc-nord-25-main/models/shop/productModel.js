const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'EUR'
    },
    category: {
        type: String,
        required: true,
        enum: ['membership', 'addon', 'service', 'subscription']
    },
    duration: {
        type: Number, // in Monaten
        default: null
    },
    features: [{
        type: String
    }],
    image: {
        type: String,
        default: '/img/default-product.jpg'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    sortOrder: {
        type: Number,
        default: 0
    },
    stripeProductId: {
        type: String, // Stripe Product ID für Integration
        default: null
    },
    stripePriceId: {
        type: String, // Stripe Price ID für Integration
        default: null
    }
}, {
    timestamps: true
});

// Index für bessere Performance
productSchema.index({ category: 1, isActive: 1, sortOrder: 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;