// backend/routes/portfolioRoutes.js

const express = require('express');
const { getPortfolio } = require('../controllers/portfolioController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Is file ke saare routes ke liye login zaroori hai
router.use(protect);

// GET /api/portfolio
router.get('/', getPortfolio);

module.exports = router;