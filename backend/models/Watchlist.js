// backend/models/Watchlist.js

const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema(
  {
    // Kis user ki watchlist hai (User collection ka reference).
    // unique: true ka matlab ek user ka SIRF EK watchlist document ho sakta hai
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    // Favourite stocks ki ids (Stock collection ke references)
    stocks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stock',
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Watchlist', watchlistSchema);
