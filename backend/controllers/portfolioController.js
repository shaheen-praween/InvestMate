// backend/controllers/portfolioController.js

const Holding = require('../models/Holding');
const Order = require('../models/Order');

// Paise ko 2 decimal tak round karo (floating point ki galti se bachne ke liye)
const round2 = (n) => Math.round(n * 100) / 100;

// @desc    Logged-in user ka portfolio (holdings + summary)
// @route   GET /api/portfolio
// @access  Private (login chahiye)
const getPortfolio = async (req, res) => {
  try {
    // 1. Sirf is user ki holdings lo (req.user JWT se aaya, client se nahi).
    //    populate: har holding ke saath stock ki taaza details bhi laao
    const holdings = await Holding.find({ user: req.user._id, quantity: { $gt: 0 } })
      .populate('stock', 'symbol companyName sector currentPrice')
      .lean();

    // 2. Har holding ka hisaab
    let investedAmount = 0;
    let holdingsValue = 0;

    const rows = holdings
      .filter((h) => h.stock) // stock mil na sake to us holding ko chhod do
      .map((h) => {
        const invested = h.quantity * h.avgBuyPrice;
        const value = h.quantity * h.stock.currentPrice;
        const profitLoss = value - invested;

        investedAmount += invested;
        holdingsValue += value;

        return {
          stockId: h.stock._id,
          symbol: h.stock.symbol,
          companyName: h.stock.companyName,
          sector: h.stock.sector,
          quantity: h.quantity,
          avgBuyPrice: round2(h.avgBuyPrice),
          currentPrice: h.stock.currentPrice,
          investedAmount: round2(invested),
          currentValue: round2(value),
          profitLoss: round2(profitLoss),
          returnPercent: invested > 0 ? round2((profitLoss / invested) * 100) : 0,
        };
      })
      // Sabse badi holding pehle
      .sort((a, b) => b.currentValue - a.currentValue);

    // 3. Orders se: ab tak kul kitna kharida, aur bechne par kitna profit/loss pakka hua.
    //    Ye hisaab database ke andar hi hota hai ($group), saare orders Node mein nahi laate
    const totals = await Order.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: '$orderType',
          totalAmount: { $sum: '$totalAmount' },
          realizedPnL: { $sum: '$realizedPnL' },
        },
      },
    ]);

    const buyTotals = totals.find((t) => t._id === 'BUY');
    const sellTotals = totals.find((t) => t._id === 'SELL');

    const totalBought = buyTotals ? buyTotals.totalAmount : 0;
    const realizedPnL = sellTotals ? sellTotals.realizedPnL : 0;

    // 4. Poore portfolio ka summary
    const availableCash = req.user.walletBalance;
    const unrealizedPnL = holdingsValue - investedAmount;
    const totalPnL = unrealizedPnL + realizedPnL;

    const summary = {
      availableCash: round2(availableCash),
      investedAmount: round2(investedAmount),
      holdingsValue: round2(holdingsValue),
      portfolioValue: round2(holdingsValue + availableCash),
      unrealizedPnL: round2(unrealizedPnL),
      realizedPnL: round2(realizedPnL),
      totalPnL: round2(totalPnL),
      totalReturnPercent: totalBought > 0 ? round2((totalPnL / totalBought) * 100) : 0,
    };

    res.status(200).json({
      success: true,
      summary,
      holdings: rows,
    });
  } catch (error) {
    console.error('Portfolio error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching portfolio',
    });
  }
};

module.exports = { getPortfolio };