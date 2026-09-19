// backend/routes/authRoutes.js

const express = require('express');
const { registerUser, loginUser, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes (bina login ke chalte hain)
// POST /api/auth/register
router.post('/register', registerUser);

// POST /api/auth/login
router.post('/login', loginUser);

// Protected route (valid token chahiye)
// GET /api/auth/me
router.get('/me', protect, getMe);

module.exports = router;