// backend/controllers/authController.js

const User = require('../models/User');
const generateToken = require('../utils/generateToken');

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

// @desc    User login karo aur JWT token do
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    // 1. Missing data check
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // 2. Input type check
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid input',
      });
    }

    // 3. User dhundo. Password model mein select:false hai, isliye yahan manga rahe hain
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');

    // 4. Email galat ho ya password galat, dono case mein SAME message
    //    (taaki koi guess na kar sake ki kaunsa email registered hai)
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // 5. Password sahi hai, ab check karo account disabled to nahi
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been disabled. Please contact support.',
      });
    }

    // 6. Sab sahi: token banao aur bhejo
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletBalance: user.walletBalance,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while logging in',
    });
  }
};

module.exports = { registerUser, loginUser };