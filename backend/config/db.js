// backend/config/db.js

const mongoose = require('mongoose');

// MongoDB se connect karne wala function
const connectDB = async () => {
  try {
    // .env ke MONGO_URI se database connect karo
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB connected: ${conn.connection.host} / ${conn.connection.name}`);
  } catch (error) {
    // Connection fail hua to error dikhao aur server band kar do
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Is function ko dusri files (server.js) mein use karne ke liye export karo
module.exports = connectDB;