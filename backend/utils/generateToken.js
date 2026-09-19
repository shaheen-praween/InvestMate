// backend/utils/generateToken.js

const jwt = require('jsonwebtoken');

// User ke liye JWT token banao
const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in .env');
  }

  return jwt.sign(
    { id: user._id, role: user.role },   // payload: sirf id aur role, password kabhi nahi
    process.env.JWT_SECRET,              // secret se signature banta hai
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } // token 7 din baad expire
  );
};

module.exports = generateToken;