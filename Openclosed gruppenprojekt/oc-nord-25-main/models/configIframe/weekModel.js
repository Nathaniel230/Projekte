const mongoose = require('mongoose');

const weekSchema = new mongoose.Schema({
    customerId: {
        type: String,
        required: true,
        index: true
    },
    year: {
        type: Number,
        required: true
    },
    weekNumber: {
        type: Number,
        required: true
    },
    decoupled: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Compound index for unique weeks per customer
weekSchema.index({ customerId: 1, year: 1, weekNumber: 1 }, { unique: true });

module.exports = mongoose.model('Week', weekSchema, 'iFrame_week');
