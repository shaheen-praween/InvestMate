// backend/seed/seedStocks.js
// Ye script ek baar chalane ke liye hai: simulated stocks database mein daalti hai.
// Chalane ka tarika (backend folder se): node seed/seedStocks.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const Stock = require('../models/Stock');

// Simulated data (real market ka nahi). price = current price, prev = pichhla price
const stocks = [
  { symbol: 'TCS', companyName: 'Tata Consultancy Services', sector: 'IT', currentPrice: 3500, previousClose: 3450, description: 'Large Indian IT services and consulting company.' },
  { symbol: 'INFY', companyName: 'Infosys', sector: 'IT', currentPrice: 1500, previousClose: 1485, description: 'Indian company providing technology, consulting and outsourcing services.' },
  { symbol: 'WIPRO', companyName: 'Wipro', sector: 'IT', currentPrice: 480, previousClose: 486, description: 'Indian IT services, consulting and business process company.' },
  { symbol: 'HCLTECH', companyName: 'HCL Technologies', sector: 'IT', currentPrice: 1400, previousClose: 1388, description: 'Indian company offering IT services, engineering and software solutions.' },
  { symbol: 'RELIANCE', companyName: 'Reliance Industries', sector: 'Energy', currentPrice: 2900, previousClose: 2875, description: 'Indian conglomerate with businesses in energy, retail and telecom.' },
  { symbol: 'ONGC', companyName: 'Oil and Natural Gas Corporation', sector: 'Energy', currentPrice: 265, previousClose: 268, description: 'Indian public sector company engaged in oil and gas exploration.' },
  { symbol: 'HDFCBANK', companyName: 'HDFC Bank', sector: 'Banking', currentPrice: 1650, previousClose: 1642, description: 'Large Indian private sector bank offering retail and corporate banking.' },
  { symbol: 'ICICIBANK', companyName: 'ICICI Bank', sector: 'Banking', currentPrice: 1150, previousClose: 1138, description: 'Indian private sector bank with retail, corporate and digital banking.' },
  { symbol: 'SBIN', companyName: 'State Bank of India', sector: 'Banking', currentPrice: 780, previousClose: 785, description: 'Largest Indian public sector bank with a wide branch network.' },
  { symbol: 'KOTAKBANK', companyName: 'Kotak Mahindra Bank', sector: 'Banking', currentPrice: 1800, previousClose: 1795, description: 'Indian private sector bank offering banking and financial services.' },
  { symbol: 'HINDUNILVR', companyName: 'Hindustan Unilever', sector: 'FMCG', currentPrice: 2450, previousClose: 2460, description: 'Indian consumer goods company selling home care, beauty and food products.' },
  { symbol: 'ITC', companyName: 'ITC Limited', sector: 'FMCG', currentPrice: 430, previousClose: 428, description: 'Indian conglomerate with FMCG, hotels, paper and agri businesses.' },
  { symbol: 'NESTLEIND', companyName: 'Nestle India', sector: 'FMCG', currentPrice: 2300, previousClose: 2290, description: 'Indian food and beverage company known for packaged foods.' },
  { symbol: 'TATAMOTORS', companyName: 'Tata Motors', sector: 'Auto', currentPrice: 950, previousClose: 940, description: 'Indian automobile manufacturer of cars, commercial vehicles and EVs.' },
  { symbol: 'MARUTI', companyName: 'Maruti Suzuki India', sector: 'Auto', currentPrice: 12000, previousClose: 11920, description: 'Indian passenger car manufacturer, a subsidiary of Suzuki.' },
  { symbol: 'SUNPHARMA', companyName: 'Sun Pharmaceutical Industries', sector: 'Pharma', currentPrice: 1700, previousClose: 1690, description: 'Indian pharmaceutical company making generic and specialty medicines.' },
  { symbol: 'DRREDDY', companyName: "Dr. Reddy's Laboratories", sector: 'Pharma', currentPrice: 1250, previousClose: 1262, description: 'Indian pharmaceutical company producing generic drugs and active ingredients.' },
  { symbol: 'BHARTIARTL', companyName: 'Bharti Airtel', sector: 'Telecom', currentPrice: 1600, previousClose: 1585, description: 'Indian telecom company providing mobile, broadband and digital services.' },
  { symbol: 'TATASTEEL', companyName: 'Tata Steel', sector: 'Metals', currentPrice: 150, previousClose: 152, description: 'Indian steel manufacturer with operations across several countries.' },
  { symbol: 'LT', companyName: 'Larsen & Toubro', sector: 'Infrastructure', currentPrice: 3600, previousClose: 3570, description: 'Indian engineering and construction conglomerate.' },
];

// 30 din ki simulated price history banao.
// Kal ka price = previousClose, aaj ka price = currentPrice, usse pehle random up/down (+-2%)
const generatePriceHistory = (previousClose, currentPrice, days = 30) => {
  const prices = [currentPrice, previousClose];
  let price = previousClose;

  for (let i = 2; i < days; i++) {
    const changePct = (Math.random() - 0.5) * 0.04; // -2% se +2%
    price = price / (1 + changePct);
    prices.push(Math.round(price * 100) / 100);
  }

  prices.reverse(); // sabse purana pehle, aaj ka aakhir mein

  return prices.map((p, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (days - 1 - index));
    return { price: p, date };
  });
};

const seedStocks = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${mongoose.connection.name}`);

    let added = 0;
    let skipped = 0;

    for (const s of stocks) {
      // Stock pehle se hai to chhod do (admin ne edit kiya ho to overwrite na ho)
      const exists = await Stock.findOne({ symbol: s.symbol });
      if (exists) {
        skipped++;
        continue;
      }

      await Stock.create({
        ...s,
        priceHistory: generatePriceHistory(s.previousClose, s.currentPrice),
      });
      added++;
    }

    console.log(`Done. Added: ${added}, already existed (skipped): ${skipped}`);
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedStocks();