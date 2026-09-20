// backend/models/Holding.js

const mongoose = require('mongoose');

const holdingSchema = new mongoose.Schema(
  {
    // Kis user ke shares hain (User collection ka reference)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Kaunsa stock (Stock collection ka reference)
    stock: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stock',
      required: true,
    },

    // Abhi kitne shares hain. Fractional shares allowed nahi, sirf poore number
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Quantity cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be a whole number',
      },
    },

    // Weighted average buy price (jis average price par khareede)
    avgBuyPrice: {
      type: Number,
      required: true,
      min: [0, 'Average buy price cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

// Ek user ka ek stock ke liye sirf EK holding document ho sakta hai.
// Dobara BUY karne par naya document nahi banega, purana update hoga.
holdingSchema.index({ user: 1, stock: 1 }, { unique: true });

module.exports = mongoose.model('Holding', holdingSchema);