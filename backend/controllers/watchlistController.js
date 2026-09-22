// backend/controllers/watchlistController.js

const mongoose = require('mongoose');
const Watchlist = require('../models/Watchlist');
const Stock = require('../models/Stock');

// @desc    Logged-in user ki watchlist, stocks ki taaza price ke saath
// @route   GET /api/watchlist
// @access  Private (login chahiye)
const getWatchlist = async (req, res) => {
  try {
    // Watchlist ho hi nahi to khaali list bhej do, error nahi
    const watchlist = await Watchlist.findOne({ user: req.user._id }).populate(
      'stocks',
      'symbol companyName sector currentPrice previousClose isActive'
    );

    const stocks = (watchlist ? watchlist.stocks : [])
      // Jo stock delete/na-active ho gaya ho, use na dikhao
      .filter((s) => s && s.isActive)
      .map((s) => {
        const change = Math.round((s.currentPrice - s.previousClose) * 100) / 100;
        const changePercent = s.previousClose
          ? Math.round((change / s.previousClose) * 10000) / 100
          : 0;

        return {
          stockId: s._id,
          symbol: s.symbol,
          companyName: s.companyName,
          sector: s.sector,
          currentPrice: s.currentPrice,
          change,
          changePercent,
        };
      });

    res.status(200).json({
      success: true,
      count: stocks.length,
      stocks,
    });
  } catch (error) {
    console.error('Get watchlist error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching watchlist',
    });
  }
};

// @desc    Ek stock watchlist mein add karo
// @route   POST /api/watchlist
// @access  Private (login chahiye)
const addToWatchlist = async (req, res) => {
  try {
    const { stockId } = req.body || {};

    if (typeof stockId !== 'string' || !mongoose.isValidObjectId(stockId)) {
      return res.status(400).json({ success: false, message: 'Invalid stock id' });
    }

    // Stock hona chahiye aur active hona chahiye
    const stock = await Stock.findOne({ _id: stockId, isActive: true });
    if (!stock) {
      return res.status(404).json({ success: false, message: 'Stock not found' });
    }

    // upsert: watchlist nahi hai to naya bana do.
    // $addToSet: stock pehle se list mein hai to dobara nahi jodega (duplicate se bachav),
    // ye check aur add ek hi atomic query mein hota hai
    await Watchlist.updateOne(
      { user: req.user._id },
      { $addToSet: { stocks: stock._id } },
      { upsert: true }
    );

    res.status(201).json({
      success: true,
      message: `${stock.symbol} added to your watchlist`,
    });
  } catch (error) {
    console.error('Add to watchlist error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while updating watchlist',
    });
  }
};

// @desc    Ek stock watchlist se hatao
// @route   DELETE /api/watchlist/:stockId
// @access  Private (login chahiye)
const removeFromWatchlist = async (req, res) => {
  try {
    const { stockId } = req.params;

    if (!mongoose.isValidObjectId(stockId)) {
      return res.status(400).json({ success: false, message: 'Invalid stock id' });
    }

    // $pull: array se us id ko nikaal do, agar hai to
    const result = await Watchlist.updateOne(
      { user: req.user._id },
      { $pull: { stocks: stockId } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Watchlist not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Removed from your watchlist',
    });
  } catch (error) {
    console.error('Remove from watchlist error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while updating watchlist',
    });
  }
};

module.exports = { getWatchlist, addToWatchlist, removeFromWatchlist };