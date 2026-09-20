// backend/server.js

// 1. .env file ki values load karo (sabse pehle)
require('dotenv').config();

// 2. Packages import karo
const path = require('path');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const stockRoutes = require('./routes/stockRoutes');
const orderRoutes = require('./routes/orderRoutes');

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
app.use('/api/stocks', stockRoutes);
app.use('/api/orders', orderRoutes);

// 7. Frontend files serve karo (frontend folder backend ke bahar hai, isliye ../frontend)
//    extensions: ['html'] ka matlab: /login kholne par login.html khulega
app.use(express.static(path.join(__dirname, '../frontend'), { extensions: ['html'] }));

// 8. Stock detail page: /stock/<id> par hamesha stock.html dikhao
//    (id ko page ki JS URL se padhti hai)
app.get('/stock/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/stock.html'));
});

// 9. Home page kholne par login page par bhej do
app.get('/', (req, res) => {
  res.redirect('/login');
});

// 10. Agar koi route match na ho to 404 jawab do
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// 11. Pehle database connect karo, phir server start karo
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});