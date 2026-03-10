const mongoose = require('mongoose');

const specialDaySchema = new mongoose.Schema({
    customerId: {
        type: String,
        required: true,
        index: true
    },
    dateFrom: {
        type: Date,
        required: true
    },
    dateTo: {
        type: Date,
        required: true
    },
    isOpen: {
        type: Boolean, // true = offen, false = geschlossen
        default: true
    },
    // Additional fields from schema image
    isWholeDay: {
        type: Boolean,
        default: true
    },
    timeFrom: {
        type: String
    },
    timeTo: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('SpecialDay', specialDaySchema, 'iFrame_specialdays');