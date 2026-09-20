// backend/controllers/orderController.js

const User = require('../models/User');
const Stock = require('../models/Stock');
const Holding = require('../models/Holding');
const Order = require('../models/Order');

const MAX_QUANTITY = 100000;

// Paise ko 2 decimal tak round karo (floating point ki galti se bachne ke liye)
const round2 = (n) => Math.round(n * 100) / 100;

const formatRupees = (n) =>
  '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// BUY aur SELL, dono ke liye input check: { stockId, quantity }
const validateTradeInput = (body) => {
  const { stockId, quantity } = body || {};

  if (stockId === undefined || quantity === undefined) {
    return { error: 'stockId and quantity are required' };
  }

  if (typeof stockId !== 'string' || !/^[a-f0-9]{24}$/i.test(stockId)) {
    return { error: 'Invalid stock id' };
  }

  if (
    typeof quantity !== 'number' ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_QUANTITY
  ) {
    return { error: `Quantity must be a whole number between 1 and ${MAX_QUANTITY}` };
  }

  return { stockId, quantity };
};

// Rollback ka kaam fail ho jaye to bhi server crash na ho, bas log kar do
const safeRollback = async (label, fn) => {
  try {
    await fn();
  } catch (error) {
    console.error(`CRITICAL: rollback failed (${label}):`, error.message);
  }
};

// @desc    Virtual shares kharido
// @route   POST /api/orders/buy
// @access  Private (login chahiye)
const buyStock = async (req, res) => {
  try {
    // 1. Input check. Price client se KABHI nahi lete, sirf stockId aur quantity
    const input = validateTradeInput(req.body);
    if (input.error) {
      return res.status(400).json({ success: false, message: input.error });
    }
    const { stockId, quantity } = input;

    // 2. Stock validate karo (hona chahiye aur active hona chahiye)
    const stock = await Stock.findOne({ _id: stockId, isActive: true });
    if (!stock) {
      return res.status(404).json({ success: false, message: 'Stock not found' });
    }

    // 3. Amount calculate karo, price database se (stock.currentPrice)
    const price = stock.currentPrice;
    const totalAmount = round2(price * quantity);

    // 4. Wallet se paisa kaato. ATOMIC: "balance kaafi ho tabhi kaato" ek hi query mein.
    //    Kaafi nahi hai to kuch match nahi hoga aur updatedUser null aayega.
    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user._id, walletBalance: { $gte: totalAmount } },
      { $inc: { walletBalance: -totalAmount } },
      { returnDocument: 'after' }
    );

    if (!updatedUser) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Required ${formatRupees(totalAmount)}, available ${formatRupees(req.user.walletBalance)}`,
      });
    }

    // 5. BUY order save karo. Fail hua to paisa wapas
    let order;
    try {
      order = await Order.create({
        user: req.user._id,
        stock: stock._id,
        symbol: stock.symbol,
        orderType: 'BUY',
        quantity,
        price,
        totalAmount,
      });
    } catch (error) {
      await safeRollback('refund wallet', () =>
        User.updateOne({ _id: req.user._id }, { $inc: { walletBalance: totalAmount } })
      );
      throw error;
    }

    // 6. Holding banao ya update karo. ATOMIC, ek hi query mein:
    //    naya avg = (purani qty x purana avg + is baar ka amount) / (purani qty + nayi qty)
    //    Holding pehle se nahi hai to upsert naya bana dega ($ifNull purane fields ko 0 maan leta hai)
    //    updatePipeline: true zaroori hai, kyunki neeche update ek array (pipeline) hai
    let holding;
    try {
      holding = await Holding.findOneAndUpdate(
        { user: req.user._id, stock: stock._id },
        [
          {
            $set: {
              avgBuyPrice: {
                $divide: [
                  {
                    $add: [
                      { $multiply: [{ $ifNull: ['$quantity', 0] }, { $ifNull: ['$avgBuyPrice', 0] }] },
                      totalAmount,
                    ],
                  },
                  { $add: [{ $ifNull: ['$quantity', 0] }, quantity] },
                ],
              },
              quantity: { $add: [{ $ifNull: ['$quantity', 0] }, quantity] },
            },
          },
        ],
        { upsert: true, returnDocument: 'after', updatePipeline: true }
      );
    } catch (error) {
      // Holding fail hui: order hata do aur paisa wapas karo
      await safeRollback('delete order', () => Order.deleteOne({ _id: order._id }));
      await safeRollback('refund wallet', () =>
        User.updateOne({ _id: req.user._id }, { $inc: { walletBalance: totalAmount } })
      );
      throw error;
    }

    // 7. Response
    res.status(201).json({
      success: true,
      message: `Bought ${quantity} share${quantity === 1 ? '' : 's'} of ${stock.symbol} at ${formatRupees(price)}`,
      order: {
        id: order._id,
        symbol: order.symbol,
        orderType: order.orderType,
        quantity: order.quantity,
        price: order.price,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
      },
      holding: {
        quantity: holding.quantity,
        avgBuyPrice: round2(holding.avgBuyPrice),
      },
      walletBalance: round2(updatedUser.walletBalance),
    });
  } catch (error) {
    console.error('Buy error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Could not place the order. Please try again.',
    });
  }
};

// @desc    Virtual shares becho
// @route   POST /api/orders/sell
// @access  Private (login chahiye)
const sellStock = async (req, res) => {
  try {
    // 1. Input check. Price client se KABHI nahi lete
    const input = validateTradeInput(req.body);
    if (input.error) {
      return res.status(400).json({ success: false, message: input.error });
    }
    const { stockId, quantity } = input;

    // 2. Stock dhundo. Yahan isActive check nahi karte: agar admin ne koi stock remove kar diya,
    //    to jis user ke paas uske shares hain wo bech kar nikal sake, phans na jaye
    const stock = await Stock.findById(stockId);
    if (!stock) {
      return res.status(404).json({ success: false, message: 'Stock not found' });
    }

    // 3. Amount calculate karo, price database se
    const price = stock.currentPrice;
    const totalAmount = round2(price * quantity);

    // 4. Holding se shares ghatao. ATOMIC: "quantity kaafi ho tabhi ghatao" ek hi query mein.
    //    returnDocument: 'before' ka matlab: ghatane se PEHLE wala holding wapas do
    //    (usme se avgBuyPrice aur purani quantity milegi)
    const holdingBefore = await Holding.findOneAndUpdate(
      { user: req.user._id, stock: stock._id, quantity: { $gte: quantity } },
      { $inc: { quantity: -quantity } },
      { returnDocument: 'before' }
    );

    if (!holdingBefore) {
      // Kuch match nahi hua: ya to shares hain hi nahi, ya kam hain. User ko sahi wajah batao
      const existing = await Holding.findOne({ user: req.user._id, stock: stock._id });
      const owned = existing ? existing.quantity : 0;

      const message =
        owned === 0
          ? `You do not own any shares of ${stock.symbol}`
          : `You only own ${owned} share${owned === 1 ? '' : 's'} of ${stock.symbol}, cannot sell ${quantity}`;

      return res.status(400).json({ success: false, message });
    }

    // 5. Realized P/L: (bechne ki price - average khareed price) x quantity
    const avgBuyPrice = holdingBefore.avgBuyPrice;
    const realizedPnL = round2((price - avgBuyPrice) * quantity);

    // Kuch fail ho to holding ki shares wapas jod do
    const restoreHolding = () =>
      safeRollback('restore holding', () =>
        Holding.updateOne({ user: req.user._id, stock: stock._id }, { $inc: { quantity } })
      );

    // 6. SELL order save karo. Fail hua to shares wapas
    let order;
    try {
      order = await Order.create({
        user: req.user._id,
        stock: stock._id,
        symbol: stock.symbol,
        orderType: 'SELL',
        quantity,
        price,
        totalAmount,
        realizedPnL,
      });
    } catch (error) {
      await restoreHolding();
      throw error;
    }

    // 7. Wallet mein paisa daalo. Fail hua to order hatao aur shares wapas
    let updatedUser;
    try {
      updatedUser = await User.findOneAndUpdate(
        { _id: req.user._id },
        { $inc: { walletBalance: totalAmount } },
        { returnDocument: 'after' }
      );
      if (!updatedUser) {
        throw new Error('User not found while crediting wallet');
      }
    } catch (error) {
      await safeRollback('delete order', () => Order.deleteOne({ _id: order._id }));
      await restoreHolding();
      throw error;
    }

    // 8. Saare shares bik gaye to khaali holding hata do
    const remainingQuantity = holdingBefore.quantity - quantity;
    if (remainingQuantity === 0) {
      try {
        await Holding.deleteOne({ user: req.user._id, stock: stock._id, quantity: 0 });
      } catch (error) {
        // Ye zaroori nahi hai: trade poora ho chuka hai, bas log kar do
        console.error('Could not delete empty holding:', error.message);
      }
    }

    // 9. Response
    res.status(201).json({
      success: true,
      message: `Sold ${quantity} share${quantity === 1 ? '' : 's'} of ${stock.symbol} at ${formatRupees(price)}`,
      order: {
        id: order._id,
        symbol: order.symbol,
        orderType: order.orderType,
        quantity: order.quantity,
        price: order.price,
        totalAmount: order.totalAmount,
        realizedPnL: order.realizedPnL,
        status: order.status,
        createdAt: order.createdAt,
      },
      holding: {
        quantity: remainingQuantity,
        avgBuyPrice: round2(avgBuyPrice),
      },
      walletBalance: round2(updatedUser.walletBalance),
    });
  } catch (error) {
    console.error('Sell error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Could not place the order. Please try again.',
    });
  }
};

module.exports = { buyStock, sellStock };