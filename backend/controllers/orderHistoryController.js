// backend/controllers/orderHistoryController.js

const Order = require('../models/Order');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Query string hamesha text hota hai ("2"). Use positive whole number mein badlo, galat ho to null
const toPositiveInt = (value) => {
  if (typeof value !== 'string' || !/^\d{1,6}$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 ? n : null;
};

// @desc    Logged-in user ke orders (naye pehle), filter aur pages ke saath
// @route   GET /api/orders?type=BUY&page=1&limit=20
// @access  Private (login chahiye)
const getOrders = async (req, res) => {
  try {
    const { type, page, limit } = req.query;

    // 1. Filter: HAMESHA sirf is user ke orders. User ki id JWT se aati hai, request se nahi,
    //    isliye koi kisi aur ke orders maang hi nahi sakta
    const filter = { user: req.user._id };

    // 2. Type filter (optional): sirf BUY ya SELL
    if (type !== undefined) {
      const orderType = typeof type === 'string' ? type.toUpperCase() : '';
      if (!['BUY', 'SELL'].includes(orderType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid order type. Use BUY or SELL',
        });
      }
      filter.orderType = orderType;
    }

    // 3. Page number aur page ka size (optional)
    let pageNumber = 1;
    if (page !== undefined) {
      pageNumber = toPositiveInt(page);
      if (!pageNumber) {
        return res.status(400).json({ success: false, message: 'Invalid page number' });
      }
    }

    let limitNumber = DEFAULT_LIMIT;
    if (limit !== undefined) {
      limitNumber = toPositiveInt(limit);
      if (!limitNumber) {
        return res.status(400).json({ success: false, message: 'Invalid limit' });
      }
      limitNumber = Math.min(limitNumber, MAX_LIMIT); // ek baar mein 100 se zyada nahi
    }

    // 4. Orders aur total count, dono ek saath (parallel) mangwao
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1, _id: -1 }) // naye pehle
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .lean(),
      Order.countDocuments(filter),
    ]);

    // 5. Response: sirf wahi fields jo chahiye
    res.status(200).json({
      success: true,
      orders: orders.map((o) => ({
        id: o._id,
        stockId: o.stock,
        symbol: o.symbol,
        orderType: o.orderType,
        quantity: o.quantity,
        price: o.price,
        totalAmount: o.totalAmount,
        realizedPnL: o.realizedPnL,
        status: o.status,
        createdAt: o.createdAt,
      })),
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.max(1, Math.ceil(total / limitNumber)),
      },
    });
  } catch (error) {
    console.error('Get orders error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders',
    });
  }
};

module.exports = { getOrders };
