// frontend/js/dashboard.js

const alertBox = document.getElementById('alertBox');
const holdingsBody = document.getElementById('holdingsBody');
const emptyHoldings = document.getElementById('emptyHoldings');
const viewAllHoldings = document.getElementById('viewAllHoldings');
const ordersBody = document.getElementById('ordersBody');
const emptyOrders = document.getElementById('emptyOrders');
const viewAllOrders = document.getElementById('viewAllOrders');
const watchlistBody = document.getElementById('watchlistBody');
const emptyWatchlist = document.getElementById('emptyWatchlist');
const viewAllWatchlist = document.getElementById('viewAllWatchlist');

// Dashboard par kitni holdings aur orders dikhane hain (baaki alag pages par)
const TOP_HOLDINGS = 5;
const RECENT_ORDERS = 5;

// Har jagah textContent (innerHTML nahi), taaki server ka data HTML ki tarah na chale
function setText(id, text, className) {
  const el = document.getElementById(id);
  el.textContent = text;
  if (className !== undefined) {
    el.className = `summary-value ${className}`;
  }
}

// Ek table cell banao
function createCell(text, className) {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

/* ---------- Portfolio (summary cards + top holdings) ---------- */

function renderSummary(summary) {
  setText('portfolioValue', formatPrice(summary.portfolioValue));
  setText('investedAmount', formatPrice(summary.investedAmount));
  setText('availableCash', formatPrice(summary.availableCash));

  // Profit hara, loss lal
  setText('totalPnl', formatSignedPrice(summary.totalPnL), pnlClass(summary.totalPnL));
  setText('totalReturn', formatSignedPercent(summary.totalReturnPercent), pnlClass(summary.totalReturnPercent));

  document.getElementById('pnlBreakdown').textContent =
    `Unrealized ${formatSignedPrice(summary.unrealizedPnL)} | Realized ${formatSignedPrice(summary.realizedPnL)}`;
}

function renderHoldings(holdings) {
  holdingsBody.innerHTML = ''; // purani rows hatao
  emptyHoldings.hidden = holdings.length > 0;
  viewAllHoldings.hidden = holdings.length === 0;

  // Portfolio API sabse badi holding pehle deti hai, to pehli kuch hi lo
  holdings.slice(0, TOP_HOLDINGS).forEach((h) => {
    const tr = document.createElement('tr');
    tr.className = 'clickable';

    // Row par click karne se us stock ka page khulega
    tr.addEventListener('click', () => {
      window.location.href = `/stock/${h.stockId}`;
    });

    // Stock: symbol aur neeche company ka naam
    const stockCell = document.createElement('td');
    const symbol = document.createElement('div');
    symbol.className = 'symbol';
    symbol.textContent = h.symbol;
    const company = document.createElement('div');
    company.className = 'muted';
    company.textContent = h.companyName;
    stockCell.appendChild(symbol);
    stockCell.appendChild(company);
    tr.appendChild(stockCell);

    tr.appendChild(createCell(String(h.quantity), 'num'));
    tr.appendChild(createCell(formatPrice(h.currentValue), 'num'));
    tr.appendChild(createCell(formatSignedPrice(h.profitLoss), `num ${pnlClass(h.profitLoss)}`));

    holdingsBody.appendChild(tr);
  });
}

async function loadPortfolio() {
  try {
    // Portfolio ke saare numbers backend ke database calculation se aate hain, hardcoded nahi
    const data = await apiRequest('/portfolio');
    renderSummary(data.summary);
    renderHoldings(data.holdings);
  } catch (error) {
    // 401 par apiRequest khud logout karke /login bhej deta hai, baaki errors yahan dikhte hain
    showAlert(alertBox, error.message);
  }
}

/* ---------- Recent orders ---------- */

function renderOrders(orders) {
  ordersBody.innerHTML = ''; // purani rows hatao
  emptyOrders.hidden = orders.length > 0;
  viewAllOrders.hidden = orders.length === 0;

  orders.forEach((o) => {
    const tr = document.createElement('tr');
    tr.className = 'clickable';

    // Row par click karne se us stock ka page khulega
    tr.addEventListener('click', () => {
      window.location.href = `/stock/${o.stockId}`;
    });

    tr.appendChild(createCell(formatDateTime(o.createdAt)));
    tr.appendChild(createCell(o.symbol, 'symbol'));

    // BUY hara badge, SELL lal badge
    const typeCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `type-badge ${o.orderType === 'BUY' ? 'type-buy' : 'type-sell'}`;
    badge.textContent = o.orderType;
    typeCell.appendChild(badge);
    tr.appendChild(typeCell);

    tr.appendChild(createCell(String(o.quantity), 'num'));
    tr.appendChild(createCell(formatPrice(o.totalAmount), 'num'));

    ordersBody.appendChild(tr);
  });
}

async function loadRecentOrders() {
  try {
    // Sirf sabse naye 5 orders (API naye pehle deti hai)
    const data = await apiRequest(`/orders?limit=${RECENT_ORDERS}`);
    renderOrders(data.orders);
  } catch (error) {
    showAlert(alertBox, error.message);
  }
}

/* ---------- Watchlist summary ---------- */

const TOP_WATCHLIST = 5;

function renderWatchlist(stocks) {
  watchlistBody.innerHTML = ''; // purani rows hatao
  emptyWatchlist.hidden = stocks.length > 0;
  viewAllWatchlist.hidden = stocks.length === 0;

  // Pehli kuch hi dikhao, baaki poori list /watchlist page par
  stocks.slice(0, TOP_WATCHLIST).forEach((stock) => {
    const tr = document.createElement('tr');
    tr.className = 'clickable';

    // Row par click karne se us stock ka page khulega
    tr.addEventListener('click', () => {
      window.location.href = `/stock/${stock.stockId}`;
    });

    tr.appendChild(createCell(stock.symbol, 'symbol'));
    tr.appendChild(createCell(stock.companyName));
    tr.appendChild(createCell(formatPrice(stock.currentPrice), 'num'));

    // Price badha to hara (+), ghata to lal (-)
    const direction = stock.change > 0 ? 'up' : stock.change < 0 ? 'down' : '';
    const sign = stock.change > 0 ? '+' : '';
    tr.appendChild(createCell(`${sign}${stock.change.toFixed(2)}`, `num ${direction}`));

    watchlistBody.appendChild(tr);
  });
}

async function loadWatchlist() {
  try {
    const data = await apiRequest('/watchlist');
    renderWatchlist(data.stocks);
  } catch (error) {
    showAlert(alertBox, error.message);
  }
}

/* ---------- Page start ---------- */

function init() {
  // Login nahi hai to /login par bhej do (api.js ka function)
  if (!requireAuth()) return;

  // Logout button
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Browser mein saved naam turant dikha do (backend ka jawab aane se pehle)
  const savedUser = getUser();
  if (savedUser) {
    document.getElementById('navUserName').textContent = savedUser.name;
    document.getElementById('welcomeName').textContent = savedUser.name;
  }

  // Dono kaam alag alag chalte hain: ek fail ho to doosra phir bhi dikhe
  loadPortfolio();
  loadRecentOrders();
  loadWatchlist();
}

init();