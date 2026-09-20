// backend/models/Stock.js

const mongoose = require('mongoose');

// Price history ka ek entry: { price, date }. Har entry ka alag _id nahi chahiye
const priceHistorySchema = new mongoose.Schema(
  {
    price: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
  },
  { _id: false }
);

const stockSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: [true, 'Symbol is required'],
      unique: true,       // ek symbol ka sirf ek stock
      uppercase: true,    // tcs likha to TCS ban jayega
      trim: true,
      maxlength: [20, 'Symbol cannot be more than 20 characters'],
    },

    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [100, 'Company name cannot be more than 100 characters'],
    },

    sector: {
      type: String,
      required: [true, 'Sector is required'],
      trim: true,
    },

    // Simulated current price. Saari BUY/SELL isi price par hongi
    currentPrice: {
      type: Number,
      required: [true, 'Current price is required'],
      min: [0.01, 'Price must be greater than 0'],
    },

    // Pichhla price, isse price change nikalte hain
    previousClose: {
      type: Number,
      required: [true, 'Previous close is required'],
      min: [0.01, 'Previous close must be greater than 0'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot be more than 1000 characters'],
      default: '',
    },

    // Price chart ke liye. Har admin price update par ek entry judegi
    priceHistory: {
      type: [priceHistorySchema],
      default: [],
    },

    // Soft delete: admin "remove" kare to false ho jayega, delete nahi hoga.
    // Kyunki purane Orders aur Holdings is stock ko point karte hain
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },     // change aur changePercent JSON response mein aayenge
    toObject: { virtuals: true },
  }
);

// Virtual field: database mein save nahi hota, jab chahiye tab calculate hota hai
// Price change = currentPrice - previousClose
stockSchema.virtual('change').get(function () {
  return Math.round((this.currentPrice - this.previousClose) * 100) / 100;
});

// Change percent = (change / previousClose) x 100
stockSchema.virtual('changePercent').get(function () {
  if (!this.previousClose) return 0;
  return Math.round(((this.currentPrice - this.previousClose) / this.previousClose) * 10000) / 100;
});

module.exports = mongoose.model('Stock', stockSchema);