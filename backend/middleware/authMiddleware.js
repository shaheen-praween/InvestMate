// backend/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

// protect: sirf logged-in user (valid token wala) aage ja sakta hai
const protect = async (req, res, next) => {
  try {
    // 1. Header se token nikalo. Format: "Authorization: Bearer <token>"
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided',
      });
    }

    const token = authHeader.split(' ')[1];

    // 2. Token verify karo (signature aur expiry dono check hoti hain)
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch (err) {
      const message =
        err.name === 'TokenExpiredError'
          ? 'Token expired, please login again'
          : 'Not authorized, invalid token';

      return res.status(401).json({ success: false, message });
    }

    // 3. Token ke andar ka id sahi format ka hona chahiye
    if (!mongoose.isValidObjectId(decoded.id)) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, invalid token',
      });
    }

    // 4. Database se user lao (password default se nahi aata, select:false)
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user no longer exists',
      });
    }

    // 5. Admin ne user ko disable kiya ho to purana token bhi kaam nahi karega
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been disabled. Please contact support.',
      });
    }

    // 6. User ko request mein chipka do, aage controllers req.user use karenge
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication',
    });
  }
};

// authorize: sirf specific roles ko allow karo (jaise sirf admin)
// Use: router.get('/x', protect, authorize('admin'), controller)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: you do not have permission to do this',
      });
    }
    next();
  };
};

module.exports = { protect, authorize };