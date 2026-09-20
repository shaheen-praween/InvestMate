// backend/controllers/stockController.js

const mongoose = require('mongoose');
const Stock = require('../models/Stock');

// Search text mein special characters (. * + ? etc.) ko normal text bana do.
// Warna koi galat regex bhejkar server ko atka sakta hai.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Saare active stocks ki list (search ke saath)
// @route   GET /api/stocks?search=tcs
// @access  Private (login chahiye)
const getStocks = async (req, res) => {
  try {
    const { search } = req.query;

    // Sirf active stocks dikhao (admin ne remove kiya ho to nahi dikhega)
    const filter = { isActive: true };

    if (search !== undefined) {
      // ?search[$ne]=x jaisa object/array aaya to reject karo (NoSQL injection se bachav)
      if (typeof search !== 'string' || search.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Invalid search text',
        });
      }

      const text = search.trim();
      if (text) {
        const regex = new RegExp(escapeRegex(text), 'i'); // 'i' = capital/small farak nahi
        // Symbol ya company name, dono mein dhundo
        filter.$or = [{ symbol: regex }, { companyName: regex }];
      }
    }

    // List mein priceHistory nahi bhejte (bahut bada hota hai, chart sirf detail page par chahiye)
    const stocks = await Stock.find(filter)
      .select('-priceHistory')
      .sort({ companyName: 1 });

    res.status(200).json({
      success: true,
      count: stocks.length,
      stocks,
    });
  } catch (error) {
    console.error('Get stocks error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching stocks',
    });
  }
};

// @desc    Ek stock ki poori detail (price history ke saath)
// @route   GET /api/stocks/:id
// @access  Private (login chahiye)
const getStockById = async (req, res) => {
  try {
    const { id } = req.params;

    // ID ka format sahi hona chahiye, warna Mongoose error deta hai
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid stock id',
      });
    }

    const stock = await Stock.findOne({ _id: id, isActive: true });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Stock not found',
      });
    }

    res.status(200).json({
      success: true,
      stock,
    });
  } catch (error) {
    console.error('Get stock error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching stock',
    });
  }
};

module.exports = { getStocks, getStockById };