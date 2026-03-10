const mongoose = require('mongoose');
const path = require('path');
const Week = require('../models/configIframe/weekModel');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const dumpWeeks = async () => {
    try {
        await mongoose.connect(process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD));
        console.log('Connected to DB');

        const weeks = await Week.find({}); // Get everything
        console.log(`Total Weeks Found: ${weeks.length}`);

        weeks.forEach(w => {
            console.log(`ID: ${w._id}, Year: ${w.year}, Week: ${w.weekNumber}, Decoupled: ${w.decoupled} (${typeof w.decoupled})`);
        });

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

dumpWeeks();
