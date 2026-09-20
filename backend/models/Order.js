// backend/models/Order.js

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    // Kis user ne order kiya
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Kaunsa stock
    stock: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stock',
      required: true,
    },

    // Symbol ki copy (order history dikhane ke liye har baar stock ko dhundna na pade)
    symbol: {
      type: String,
      required: true,
      uppercase: true,
    },

    orderType: {
      type: String,
      enum: ['BUY', 'SELL'],
      required: true,
    },

    // Kitne shares (poore number, kam se kam 1)
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be a whole number',
      },
    },

    // Trade ke waqt ki price per share. Stock ki price baad mein badlegi, ye nahi badlegi
    price: {
      type: Number,
      required: true,
      min: [0.01, 'Price must be greater than 0'],
    },

    // quantity x price
    totalAmount: {
      type: Number,
      required: true,
      min: [0.01, 'Total amount must be greater than 0'],
    },

    // Sirf poore hue orders save hote hain
    status: {
      type: String,
      enum: ['COMPLETED'],
      default: 'COMPLETED',
    },

    // Sirf SELL mein: (sell price - avg buy price) x quantity. BUY mein hamesha 0
    realizedPnL: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // createdAt hi order ki date/time hai
  }
);

// Order history "is user ke orders, naye pehle" ke liye jaldi query
orderSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);