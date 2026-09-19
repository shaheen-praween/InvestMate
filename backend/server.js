// backend/server.js

// 1. .env file ki values load karo (sabse pehle)
require('dotenv').config();

// 2. Packages import karo
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');

// 3. Express app banao
const app = express();

// 4. Middlewares (har request in se guzarti hai)
app.use(cors());          // browser ko backend se baat karne do
app.use(express.json());  // request body ka JSON padhne ke liye

// 5. Test route: check karne ke liye ki server chal raha hai
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'InvestMate API is running',
  });
});

// 6. API routes
app.use('/api/auth', authRoutes);

// 7. Agar koi route match na ho to 404 jawab do
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// 8. Pehle database connect karo, phir server start karo
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});