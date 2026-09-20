// frontend/js/stock.js

const alertBox = document.getElementById('alertBox');
const stockContent = document.getElementById('stockContent');

// URL /stock/<id> se id nikalo
function getStockIdFromUrl() {
  const parts = window.location.pathname.split('/').filter(Boolean); // ['stock', '<id>']
  return parts[1] || '';
}

// Har jagah textContent (innerHTML nahi), taaki server ka data HTML ki tarah na chale
function setText(id, text) {
  document.getElementById(id).textContent = text;
}

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

    stockContent.hidden = false;

    if (stock.priceHistory && stock.priceHistory.length > 0) {
      drawChart(stock.priceHistory);
    }
  } catch (error) {
    // Jaise "Stock not found". 401 par apiRequest khud logout karke /login bhej deta hai
    showAlert(alertBox, error.message);
  }
}

init();