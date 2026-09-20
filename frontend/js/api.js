// frontend/js/api.js

// Browser ki localStorage mein data in naamon (keys) se save hoga
const TOKEN_KEY = 'investmate_token';
const USER_KEY = 'investmate_user';

/* ---------- Token aur user ka data save / read / delete ---------- */

function saveAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch (error) {
    return null;
  }
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function isLoggedIn() {
  return !!getToken();
}

/* ---------- Login / logout aur page protection ---------- */

function logout() {
  clearAuth();
  window.location.href = '/login';
}

// Protected pages (dashboard etc.) ke upar lagao: login nahi hai to /login par bhej do
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/login';
    return false;
  }
  return true;
}

// Login/register pages par lagao: pehle se login hai to dashboard par bhej do
function redirectIfLoggedIn() {
  if (isLoggedIn()) {
    window.location.href = '/dashboard';
  }
}

/* ---------- Backend API call ka common function ---------- */
// Use: await apiRequest('/auth/login', { method: 'POST', body: { email, password }, auth: false })
// auth: true (default) matlab token header mein bheja jayega
async function apiRequest(path, { method = 'GET', body = null, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();

  if (auth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });
  } catch (error) {
    // Server band hai ya internet ki dikkat
    throw new Error('Cannot connect to server. Please try again.');
  }

  // Backend ka jawab JSON mein aata hai
  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    // Jawab JSON nahi tha, data khaali rahega
  }

  if (!response.ok) {
    // Token expire / galat ho, ya account disabled ho: logout karke login par bhejo
    const isDisabled = response.status === 403 && /disabled/i.test(data.message || '');
    if (auth && token && (response.status === 401 || isDisabled)) {
      clearAuth();
      window.location.href = '/login';
    }
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

/* ---------- Error / success message dikhane ke helpers ---------- */

function showAlert(element, message, type = 'error') {
  element.textContent = message;
  element.className = `alert alert-${type} show`;
}

function hideAlert(element) {
  element.className = 'alert';
  element.textContent = '';
}

/* ---------- Price ko ₹3,500.00 jaise format mein dikhao ---------- */

function formatPrice(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ---------- Profit / Loss dikhane ke helpers ---------- */

// +₹1,820.00 ya -₹500.00 (0 ho to bina sign ke)
function formatSignedPrice(amount) {
  const n = Number(amount);
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  return sign + formatPrice(Math.abs(n));
}

// +3.64% ya -1.20%
function formatSignedPercent(value) {
  const n = Number(value);
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  return `${sign}${Math.abs(n).toFixed(2)}%`;
}

// Profit par 'up' (hara), loss par 'down' (lal), 0 par kuch nahi
function pnlClass(value) {
  return value > 0 ? 'up' : value < 0 ? 'down' : '';
}