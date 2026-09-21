// backend/routes/orderRoutes.js

const express = require('express');
const { buyStock, sellStock } = require('../controllers/orderController');
const { getOrders } = require('../controllers/orderHistoryController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Is file ke saare routes ke liye login zaroori hai
router.use(protect);

// GET /api/orders?type=BUY&page=1&limit=20   (order history)
router.get('/', getOrders);

// POST /api/orders/buy
router.post('/buy', buyStock);

// POST /api/orders/sell
router.post('/sell', sellStock);

module.exports = router;