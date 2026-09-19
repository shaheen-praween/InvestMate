// backend/controllers/authController.js

const User = require('../models/User');

// @desc    Naya user register karo
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    // req.body agar aaya hi nahi to crash na ho, isliye || {}
    // DHYAAN: role yahan se kabhi nahi lete, warna koi khud ko admin bana lega
    const { name, email, password } = req.body || {};

    // 1. Missing data check
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required',
      });
    }

    // 2. Input type check (sirf string allow, object/array nahi)
    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 3. Email pehle se registered to nahi?
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered',
      });
    }

    // 4. User banao (password hashing model ke pre('save') hook mein hoti hai)
    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
    });

    // 5. Response: password kabhi wapas nahi bhejte
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletBalance: user.walletBalance,
      },
    });
  } catch (error) {
    // Mongoose ke validation errors (jaise password bahut chhota)
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }

    // Duplicate email (database level unique index se)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered',
      });
    }

    console.error('Register error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while registering',
    });
  }
};

module.exports = { registerUser };