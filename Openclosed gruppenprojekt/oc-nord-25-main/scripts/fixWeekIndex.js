const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Week = require('../models/configIframe/weekModel');

// Load config
dotenv.config({ path: path.join(__dirname, '../config.env') });

async function fixIndex() {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/oc-info';
        console.log('Connecting to DB...', uri);
        await mongoose.connect(uri);
        console.log('Connected to DB');

        console.log('Syncing indexes for Week model...');
        // syncIndexes() drops indexes not in schema and creates new ones
        await Week.syncIndexes();
        console.log('Indexes synced successfully.');

        // List indexes to verify
        const indexes = await Week.collection.indexes();
        console.log('Current indexes:', JSON.stringify(indexes, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
}

fixIndex();
