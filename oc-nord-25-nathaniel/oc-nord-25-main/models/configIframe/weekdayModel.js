const mongoose = require('mongoose');

const weekdaySchema = new mongoose.Schema({
    weekId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Week',
        required: true,
        index: true
    },
    dayIndex: {
        type: Number, // 0=Monday, 6=Sunday (matching frontend array index)
        required: true
    },
    openTime: {
        type: String, // HH:mm
        required: false
    },
    closeTime: {
        type: String, // HH:mm
        required: false
    },
    isClosed: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('Weekday', weekdaySchema, 'iFrame_weekdays');