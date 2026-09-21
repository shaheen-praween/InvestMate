// frontend/js/orders.js

const PAGE_SIZE = 10;

const alertBox = document.getElementById('alertBox');
const ordersBody = document.getElementById('ordersBody');
const emptyState = document.getElementById('emptyState');
const emptyText = document.getElementById('emptyText');
const pagination = document.getElementById('pagination');
const pageInfo = document.getElementById('pageInfo');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const tabs = document.querySelectorAll('.tab');

let currentType = '';  // '' = All, 'BUY' ya 'SELL'
let currentPage = 1;
let totalPages = 1;
let requestCounter = 0; // purane (der se aaye) jawab ko ignore karne ke liye

// Ek table cell banao. textContent use kar rahe hain (innerHTML nahi), taaki koi HTML chala na sake
function createCell(text, className) {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function renderOrders(orders) {
  ordersBody.innerHTML = ''; // purani rows hatao

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
    tr.appendChild(createCell(formatPrice(o.price), 'num'));
    tr.appendChild(createCell(formatPrice(o.totalAmount), 'num'));

    // Realized P/L sirf SELL par hota hai. BUY par "-" dikhao
    if (o.orderType === 'SELL') {
      tr.appendChild(createCell(formatSignedPrice(o.realizedPnL), `num ${pnlClass(o.realizedPnL)}`));
    } else {
      tr.appendChild(createCell('-', 'num muted'));
    }

    tr.appendChild(createCell(o.status));

    ordersBody.appendChild(tr);
  });
}

function updatePagination(p) {
  currentPage = p.page;
  totalPages = p.totalPages;

  // Sirf ek hi page hai to Previous/Next dikhane ka koi matlab nahi
  pagination.hidden = totalPages <= 1;
  pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${p.total} orders)`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
}

async function loadOrders() {
  const myRequest = ++requestCounter;
  hideAlert(alertBox);

  try {
    const params = new URLSearchParams({ page: String(currentPage), limit: String(PAGE_SIZE) });
    if (currentType) params.set('type', currentType);

    const data = await apiRequest(`/orders?${params.toString()}`);

    // Tab tak user ne aage kuch aur dabaya ho to ye purana jawab ignore karo
    if (myRequest !== requestCounter) return;

    renderOrders(data.orders);
    updatePagination(data.pagination);

    // Khaali ho to message dikhao
    const isEmpty = data.orders.length === 0;
    emptyState.hidden = !isEmpty;
    if (isEmpty) {
      emptyText.textContent = currentType
        ? `You have no ${currentType} orders yet.`
        : 'You have not placed any orders yet.';
    }
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

  // Tabs: click par filter badlo aur page 1 se shuru karo
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentType = tab.dataset.type;
      currentPage = 1;
      loadOrders();
    });
  });

  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadOrders();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadOrders();
    }
  });

  loadOrders();
}

init();