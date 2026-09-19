// backend/models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,        // ek email se sirf ek account
      lowercase: true,     // Test@Gmail.com aur test@gmail.com same maane jayenge
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },

    // Yahan hashed password store hoga, asli password nahi
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,       // queries mein password default se nahi aayega
    },

    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },

    // Admin user ko disable/activate kar sake, uske liye
    isActive: {
      type: Boolean,
      default: true,
    },

    // Available cash. Naye user ko .env se ₹1,00,000 milta hai
    walletBalance: {
      type: Number,
      default: () => Number(process.env.INITIAL_WALLET_BALANCE) || 100000,
      min: [0, 'Wallet balance cannot be negative'],
    },
  },
  {
    timestamps: true, // createdAt aur updatedAt apne aap add honge
  }
);

// Har baar user save hone se pehle: agar password naya/badla hai to hash karo
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  this.password = await bcrypt.hash(this.password, 10);
});

// Login ke time: user ka typed password hashed password se match karta hai ya nahi
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);