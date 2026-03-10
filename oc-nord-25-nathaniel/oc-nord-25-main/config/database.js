const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Atlas connected');
    } catch (error) {
        console.error('DB Connection Error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;