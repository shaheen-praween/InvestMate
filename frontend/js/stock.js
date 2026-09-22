// frontend/js/stock.js

const alertBox = document.getElementById('alertBox');
const tradeAlert = document.getElementById('tradeAlert');
const stockContent = document.getElementById('stockContent');
const buyBtn = document.getElementById('buyBtn');
const sellBtn = document.getElementById('sellBtn');
const quantityInput = document.getElementById('quantity');
const starBtn = document.getElementById('starBtn');
let isInWatchlist = false;

let currentStock = null; // is page ka stock (id, symbol, price)

// URL /stock/<id> se id nikalo
function getStockIdFromUrl() {
  const parts = window.location.pathname.split('/').filter(Boolean); // ['stock', '<id>']
  return parts[1] || '';
}

// Har jagah textContent (innerHTML nahi), taaki server ka data HTML ki tarah na chale
function setText(id, text) {
  document.getElementById(id).textContent = text;
}

/* ---------- Chart ---------- */

function drawChart(priceHistory) {
  // Chart.js CDN se load hoti hai. Internet na ho to yahan message dikhayenge
  if (typeof Chart === 'undefined') {
    showAlert(alertBox, 'Chart library could not be loaded. Please check your internet connection.');
    return;
  }

  const labels = priceHistory.map((p) =>
    new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  );
  const prices = priceHistory.map((p) => p.price);

  // 30 din pehle se aaj tak price badha to hara, ghata to lal
  const isUp = prices[prices.length - 1] >= prices[0];
  const lineColor = isUp ? '#16a34a' : '#dc2626';
  const fillColor = isUp ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)';

  new Chart(document.getElementById('priceChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Price (₹)',
          data: prices,
          borderColor: lineColor,
          backgroundColor: fillColor,
          borderWidth: 2,
          pointRadius: 2,
          tension: 0.25,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // chart-box ki height ke hisaab se chale
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => ` ${formatPrice(context.parsed.y)}`,
          },
        },
      },
      scales: {
        y: {
          ticks: { callback: (value) => '₹' + Number(value).toLocaleString('en-IN') },
        },
        x: {
          ticks: { maxTicksLimit: 8 },
        },
      },
    },
  });
}

/* ---------- Trade (Buy / Sell) ---------- */

// Quantity ko sahi number mein badlo. Galat ho to null
function parseQuantity() {
  const raw = quantityInput.value.trim();
  const qty = Number(raw);

  if (raw === '' || !Number.isInteger(qty) || qty < 1 || qty > 100000) {
    return null;
  }
  return qty;
}

// "Estimated amount" = quantity x price (sirf dikhane ke liye, asli amount server nikalta hai)
function updateEstimate() {
  const qty = parseQuantity();
  const text = qty && currentStock ? formatPrice(qty * currentStock.currentPrice) : '-';
  setText('estimatedTotal', text);
}

function setTradeButtons(disabled) {
  buyBtn.disabled = disabled;
  sellBtn.disabled = disabled;
}

async function placeOrder(type) {
  hideAlert(tradeAlert);

  const qty = parseQuantity();
  if (!qty) {
    return showAlert(tradeAlert, 'Enter a whole number of shares between 1 and 100000');
  }

  // Confirm popup: galti se click na ho jaye
  const verb = type === 'BUY' ? 'Buy' : 'Sell';
  const price = formatPrice(currentStock.currentPrice);
  const total = formatPrice(qty * currentStock.currentPrice);
  const ok = window.confirm(
    `${verb} ${qty} share${qty === 1 ? '' : 's'} of ${currentStock.symbol} at ${price}?\nEstimated total: ${total}`
  );
  if (!ok) return;

  // Request chalte waqt dono buttons band (double click se bachne ke liye)
  setTradeButtons(true);

  try {
    // Sirf stockId aur quantity bhejte hain. PRICE KABHI NAHI, wo server apni database se leta hai
    const data = await apiRequest(`/orders/${type.toLowerCase()}`, {
      method: 'POST',
      body: { stockId: currentStock._id, quantity: qty },
    });

    // Message banao: server ka message + holding ki halat (+ SELL par profit/loss)
    let message = data.message;

    if (type === 'SELL') {
      const pnl = data.order.realizedPnL;
      const pnlText = (pnl >= 0 ? '+' : '-') + formatPrice(Math.abs(pnl));
      message += `. Profit/Loss on this sale: ${pnlText}`;
    }

    if (data.holding.quantity > 0) {
      message += `. You now own ${data.holding.quantity} share${data.holding.quantity === 1 ? '' : 's'} (avg ${formatPrice(data.holding.avgBuyPrice)})`;
    } else {
      message += `. You no longer own any shares of ${currentStock.symbol}`;
    }

    showAlert(tradeAlert, message, 'success');

    // Wallet naya dikhao (server ne jo balance bheja wahi)
    setText('walletText', formatPrice(data.walletBalance));
  } catch (error) {
    // Jaise "Insufficient balance..." ya "You only own 3 shares...". 401 par apiRequest khud logout kar deta hai
    showAlert(tradeAlert, error.message);
  } finally {
    setTradeButtons(false);
  }
}

/* ---------- Watchlist star button ---------- */

function updateStarButton() {
  starBtn.textContent = isInWatchlist ? '★' : '☆';
  starBtn.className = isInWatchlist ? 'star-btn active' : 'star-btn';
  starBtn.title = isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist';
}

async function toggleWatchlist() {
  starBtn.disabled = true;
  try {
    if (isInWatchlist) {
      await apiRequest(`/watchlist/${currentStock._id}`, { method: 'DELETE' });
      isInWatchlist = false;
    } else {
      await apiRequest('/watchlist', { method: 'POST', body: { stockId: currentStock._id } });
      isInWatchlist = true;
    }
    updateStarButton();
  } catch (error) {
    showAlert(alertBox, error.message);
  } finally {
    starBtn.disabled = false;
  }
}

/* ---------- Page start ---------- */

async function init() {
  // Login nahi hai to /login par bhej do
  if (!requireAuth()) return;

  document.getElementById('logoutBtn').addEventListener('click', logout);

  const savedUser = getUser();
  if (savedUser) {
    setText('navUserName', savedUser.name);
  }

  const id = getStockIdFromUrl();

  // Id ka format check (24 hex characters). Galat ho to request hi nahi bhejte
  if (!/^[a-f0-9]{24}$/i.test(id)) {
    showAlert(alertBox, 'Invalid stock link');
    return;
  }

  try {
    const data = await apiRequest(`/stocks/${id}`);
    const stock = data.stock;
    currentStock = stock;

    document.title = `InvestMate - ${stock.symbol}`;

    setText('stockSymbol', stock.symbol);
    setText('stockCompany', stock.companyName);
    setText('stockSector', stock.sector);
    setText('stockSectorText', stock.sector);
    setText('stockPrice', formatPrice(stock.currentPrice));
    setText('stockPrevClose', formatPrice(stock.previousClose));
    setText('stockDescription', stock.description || 'No description available.');

    // Price change: badha to hara (+), ghata to lal (-)
    const direction = stock.change > 0 ? 'up' : stock.change < 0 ? 'down' : '';
    const sign = stock.change > 0 ? '+' : '';
    const changeEl = document.getElementById('stockChange');
    changeEl.textContent = `${sign}${stock.change.toFixed(2)} (${sign}${stock.changePercent.toFixed(2)}%)`;
    changeEl.className = direction;

    // Available cash backend se lo (localStorage ka purana balance bharosemand nahi)
    const me = await apiRequest('/auth/me');
    setText('walletText', formatPrice(me.user.walletBalance));

    stockContent.hidden = false;

    if (stock.priceHistory && stock.priceHistory.length > 0) {
      drawChart(stock.priceHistory);
    }

        // Watchlist status check karo aur star button set karo
    try {
      const watchlistData = await apiRequest('/watchlist');
      isInWatchlist = watchlistData.stocks.some((s) => String(s.stockId) === String(stock._id));
    } catch (error) {
      console.error('Could not load watchlist status:', error.message);
    }
    updateStarButton();
    starBtn.addEventListener('click', toggleWatchlist);

    // Trade ke events
    quantityInput.addEventListener('input', updateEstimate);
    buyBtn.addEventListener('click', () => placeOrder('BUY'));
    sellBtn.addEventListener('click', () => placeOrder('SELL'));
    updateEstimate();
  } catch (error) {
    // Jaise "Stock not found". 401 par apiRequest khud logout karke /login bhej deta hai
    showAlert(alertBox, error.message);
  }
}

init();