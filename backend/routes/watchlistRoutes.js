// backend/routes/watchlistRoutes.js

const express = require('express');
const {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} = require('../controllers/watchlistController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Is file ke saare routes ke liye login zaroori hai
router.use(protect);

// GET /api/watchlist
router.get('/', getWatchlist);

// POST /api/watchlist
router.post('/', addToWatchlist);

// DELETE /api/watchlist/:stockId
router.delete('/:stockId', removeFromWatchlist);

module.exports = router;