const mongoose = require('mongoose');
const path = require('path');
const Week = require('../models/configIframe/weekModel');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const checkWeeks = async () => {
    try {
        await mongoose.connect(process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD));
        console.log('DB Connected');

        // Assuming default/demo user or finding one
        // We'll just look for weeks 2, 3, 7 and see their decoupled status
        // You might need to adjust customerId if it's specific

        const weeks = await Week.find({
            weekNumber: { $in: [2, 3, 7] }
        });

        console.log('Found weeks:', weeks.length);
        weeks.forEach(w => {
            console.log(`Week ${w.weekNumber} (Year ${w.year}): Decoupled = ${w.decoupled}, ID: ${w._id}`);
        });

        const standard = await Week.findOne({ year: 0, weekNumber: 0 });
        console.log('Standard Week exists:', !!standard);
        if (standard) console.log('Standard Week ID:', standard._id);

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkWeeks();
