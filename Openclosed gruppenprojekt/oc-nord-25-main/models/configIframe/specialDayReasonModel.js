const mongoose = require('mongoose');

const specialDayReasonSchema = new mongoose.Schema({
    specialDayId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SpecialDay',
        required: true,
        index: true
    },
    language: {
        type: String, // 'de', 'en', etc.
        required: true
    },
    content: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('SpecialDayReason', specialDayReasonSchema, 'iFrame_specialday_reason');