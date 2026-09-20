// frontend/js/portfolio.js

const alertBox = document.getElementById('alertBox');
const holdingsBody = document.getElementById('holdingsBody');
const emptyState = document.getElementById('emptyState');

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

function renderSummary(summary) {
  setText('portfolioValue', formatPrice(summary.portfolioValue));
  setText('investedAmount', formatPrice(summary.investedAmount));
  setText('holdingsValue', formatPrice(summary.holdingsValue));
  setText('availableCash', formatPrice(summary.availableCash));

  // Overall P/L: profit hara, loss lal
  setText('totalPnl', formatSignedPrice(summary.totalPnL), pnlClass(summary.totalPnL));
  setText('totalReturn', formatSignedPercent(summary.totalReturnPercent), pnlClass(summary.totalReturnPercent));

  // Neeche chhoti line: kitna abhi ke shares se, kitna bech ke pakka hua
  document.getElementById('pnlBreakdown').textContent =
    `Unrealized ${formatSignedPrice(summary.unrealizedPnL)} | Realized ${formatSignedPrice(summary.realizedPnL)}`;
}

function renderHoldings(holdings) {
  holdingsBody.innerHTML = ''; // purani rows hatao
  emptyState.hidden = holdings.length > 0;

  holdings.forEach((h) => {
    const tr = document.createElement('tr');
    tr.className = 'clickable';

    // Row par click karne se us stock ka page khulega (wahin se Buy/Sell)
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

    const direction = pnlClass(h.profitLoss);

    tr.appendChild(createCell(String(h.quantity), 'num'));
    tr.appendChild(createCell(formatPrice(h.avgBuyPrice), 'num'));
    tr.appendChild(createCell(formatPrice(h.currentPrice), 'num'));
    tr.appendChild(createCell(formatPrice(h.currentValue), 'num'));
    tr.appendChild(createCell(formatSignedPrice(h.profitLoss), `num ${direction}`));
    tr.appendChild(createCell(formatSignedPercent(h.returnPercent), `num ${direction}`));

    holdingsBody.appendChild(tr);
  });
}

async function init() {
  // Login nahi hai to /login par bhej do
  if (!requireAuth()) return;

  document.getElementById('logoutBtn').addEventListener('click', logout);

  const savedUser = getUser();
  if (savedUser) {
    document.getElementById('navUserName').textContent = savedUser.name;
  }

  try {
    const data = await apiRequest('/portfolio');
    renderSummary(data.summary);
    renderHoldings(data.holdings);
  } catch (error) {
    // 401 par apiRequest khud logout karke /login bhej deta hai, baaki errors yahan dikhte hain
    showAlert(alertBox, error.message);
  }
}

init();