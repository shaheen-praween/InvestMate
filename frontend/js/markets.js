// frontend/js/markets.js

const alertBox = document.getElementById('alertBox');
const searchInput = document.getElementById('searchInput');
const stockBody = document.getElementById('stockBody');
const countText = document.getElementById('countText');
const emptyState = document.getElementById('emptyState');

let requestCounter = 0; // purane (der se aaye) jawab ko ignore karne ke liye
let debounceTimer;

// Ek table cell banao. textContent use kar rahe hain (innerHTML nahi), taaki koi HTML chala na sake
function createCell(text, className) {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function renderStocks(stocks) {
  stockBody.innerHTML = ''; // purani rows hatao

  emptyState.hidden = stocks.length > 0;
  countText.textContent = `${stocks.length} stock${stocks.length === 1 ? '' : 's'}`;

  stocks.forEach((stock) => {
    const tr = document.createElement('tr');
    tr.className = 'clickable';

    // Row par click karne se us stock ka detail page khulega
    tr.addEventListener('click', () => {
      window.location.href = `/stock/${stock._id}`;
    });

    tr.appendChild(createCell(stock.symbol, 'symbol'));
    tr.appendChild(createCell(stock.companyName));

    // Sector ka chhota badge
    const sectorCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'sector-badge';
    badge.textContent = stock.sector;
    sectorCell.appendChild(badge);
    tr.appendChild(sectorCell);

    tr.appendChild(createCell(formatPrice(stock.currentPrice), 'num'));

    // Price badha to hara (+), ghata to lal (-)
    const direction = stock.change > 0 ? 'up' : stock.change < 0 ? 'down' : '';
    const sign = stock.change > 0 ? '+' : '';

    tr.appendChild(createCell(`${sign}${stock.change.toFixed(2)}`, `num ${direction}`));
    tr.appendChild(createCell(`${sign}${stock.changePercent.toFixed(2)}%`, `num ${direction}`));

    stockBody.appendChild(tr);
  });
}

async function loadStocks(search = '') {
  const myRequest = ++requestCounter;
  hideAlert(alertBox);

  try {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const data = await apiRequest(`/stocks${query}`);

    // Tab tak user ne aage kuch aur type kar diya ho to ye purana jawab ignore karo
    if (myRequest !== requestCounter) return;

    renderStocks(data.stocks);
  } catch (error) {
    if (myRequest !== requestCounter) return;
    showAlert(alertBox, error.message);
  }
}

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
    debounceTimer = setTimeout(() => {
      loadStocks(searchInput.value.trim());
    }, 300);
  });

  loadStocks();
}

init();