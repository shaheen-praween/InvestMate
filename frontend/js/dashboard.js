// frontend/js/dashboard.js

const alertBox = document.getElementById('alertBox');

// Paise ko ₹1,00,000 jaise Indian format mein dikhao
function formatRupees(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

async function init() {
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

  try {
    // Protected route: token apne aap header mein jayega (apiRequest ka kaam)
    const data = await apiRequest('/auth/me');
    const user = data.user;

    // textContent use kar rahe hain (innerHTML nahi), taaki koi HTML chala na sake
    document.getElementById('navUserName').textContent = user.name;
    document.getElementById('welcomeName').textContent = user.name;
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userEmail').textContent = user.email;
    document.getElementById('userRole').textContent = user.role;
    document.getElementById('userWallet').textContent = formatRupees(user.walletBalance);
    document.getElementById('userSince').textContent = new Date(user.createdAt).toLocaleDateString('en-IN');
  } catch (error) {
    // 401 par apiRequest khud logout karke /login bhej deta hai, baaki errors yahan dikhte hain
    showAlert(alertBox, error.message);
  }
}

init();