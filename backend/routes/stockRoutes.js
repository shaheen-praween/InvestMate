// backend/routes/stockRoutes.js

const express = require('express');
const { getStocks, getStockById } = require('../controllers/stockController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Is file ke saare routes ke liye login zaroori hai
router.use(protect);

// GET /api/stocks?search=tcs
router.get('/', getStocks);

// GET /api/stocks/:id
router.get('/:id', getStockById);

module.exports = router;