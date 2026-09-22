// frontend/js/watchlist.js

const alertBox = document.getElementById('alertBox');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const watchlistBody = document.getElementById('watchlistBody');
const emptyState = document.getElementById('emptyState');

let watchlistIds = new Set(); // abhi watchlist mein kaunse stock ids hain
let debounceTimer;

// Ek table cell banao. textContent use kar rahe hain (innerHTML nahi), taaki koi HTML chala na sake
function createCell(text, className) {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

/* ---------- Watchlist ki table ---------- */

async function loadWatchlist() {
  try {
    const data = await apiRequest('/watchlist');
    watchlistIds = new Set(data.stocks.map((s) => String(s.stockId)));
    renderWatchlist(data.stocks);
  } catch (error) {
    showAlert(alertBox, error.message);
  }
}

function renderWatchlist(stocks) {
  watchlistBody.innerHTML = ''; // purani rows hatao
  emptyState.hidden = stocks.length > 0;

  stocks.forEach((stock) => {
    const tr = document.createElement('tr');

    tr.appendChild(createCell(stock.symbol, 'symbol'));
    tr.appendChild(createCell(stock.companyName));

    const sectorCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'sector-badge';
    badge.textContent = stock.sector;
    sectorCell.appendChild(badge);
    tr.appendChild(sectorCell);

    tr.appendChild(createCell(formatPrice(stock.currentPrice), 'num'));

    const direction = stock.change > 0 ? 'up' : stock.change < 0 ? 'down' : '';
    const sign = stock.change > 0 ? '+' : '';
    tr.appendChild(createCell(`${sign}${stock.change.toFixed(2)}`, `num ${direction}`));
    tr.appendChild(createCell(`${sign}${stock.changePercent.toFixed(2)}%`, `num ${direction}`));

    // Remove button
    const actionCell = document.createElement('td');
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => removeStock(stock.stockId, stock.symbol));
    actionCell.appendChild(removeBtn);
    tr.appendChild(actionCell);

    // Row (button ke alawa) dabane se us stock ka page khule
    tr.addEventListener('click', (event) => {
      if (event.target === removeBtn) return;
      window.location.href = `/stock/${stock.stockId}`;
    });
    tr.classList.add('clickable');

    watchlistBody.appendChild(tr);
  });
}

async function removeStock(stockId, symbol) {
  hideAlert(alertBox);
  try {
    await apiRequest(`/watchlist/${stockId}`, { method: 'DELETE' });
    showAlert(alertBox, `${symbol} removed from your watchlist`, 'success');
    await loadWatchlist();
    // Search results khule hon to unke buttons bhi refresh ho jayen
    if (searchInput.value.trim()) runSearch(searchInput.value.trim());
  } catch (error) {
    showAlert(alertBox, error.message);
  }
}

/* ---------- Search box: naya stock dhundo aur add karo ---------- */

async function runSearch(text) {
  try {
    const data = await apiRequest(`/stocks?search=${encodeURIComponent(text)}`);
    renderSearchResults(data.stocks);
  } catch (error) {
    showAlert(alertBox, error.message);
  }
}

function renderSearchResults(stocks) {
  searchResults.innerHTML = '';
  if (stocks.length === 0) return;

  const wrap = document.createElement('div');
  wrap.className = 'search-results';

  stocks.slice(0, 8).forEach((stock) => {
    const row = document.createElement('div');
    row.className = 'search-result-row';

    const info = document.createElement('div');
    info.className = 'search-result-info';
    const symbol = document.createElement('span');
    symbol.className = 'symbol';
    symbol.textContent = stock.symbol;
    const company = document.createElement('span');
    company.className = 'muted';
    company.textContent = stock.companyName;
    info.appendChild(symbol);
    info.appendChild(company);
    row.appendChild(info);

    const alreadyAdded = watchlistIds.has(String(stock._id));
    const btn = document.createElement('button');
    btn.className = alreadyAdded ? 'btn-outline btn' : 'btn';
    btn.textContent = alreadyAdded ? 'Added' : 'Add';
    btn.disabled = alreadyAdded;
    btn.addEventListener('click', () => addStock(stock._id, stock.symbol));
    row.appendChild(btn);

    wrap.appendChild(row);
  });

  searchResults.appendChild(wrap);
}

async function addStock(stockId, symbol) {
  hideAlert(alertBox);
  try {
    await apiRequest('/watchlist', { method: 'POST', body: { stockId } });
    showAlert(alertBox, `${symbol} added to your watchlist`, 'success');
    await loadWatchlist();
    runSearch(searchInput.value.trim()); // buttons ko "Added" dikhane ke liye refresh
  } catch (error) {
    showAlert(alertBox, error.message);
  }
}

/* ---------- Page start ---------- */

function init() {
  // Login nahi hai to /login par bhej do
  if (!requireAuth()) return;

  document.getElementById('logoutBtn').addEventListener('click', logout);

  const savedUser = getUser();
  if (savedUser) {
    document.getElementById('navUserName').textContent = savedUser.name;
  }

  // Har key dabane par request nahi bhejte. User ruk jaye (300ms) tab bhejte hain
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const text = searchInput.value.trim();

    if (!text) {
      searchResults.innerHTML = '';
      return;
    }

    debounceTimer = setTimeout(() => runSearch(text), 300);
  });

  loadWatchlist();
}

init();