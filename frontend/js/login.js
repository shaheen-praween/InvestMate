// frontend/js/login.js

// Pehle se login hai to login page dikhane ka koi matlab nahi
redirectIfLoggedIn();

const form = document.getElementById('loginForm');
const alertBox = document.getElementById('alertBox');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (event) => {
  // Form ka default behaviour (page reload) roko
  event.preventDefault();
  hideAlert(alertBox);

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // Basic check (asli validation backend karta hai)
  if (!email || !password) {
    return showAlert(alertBox, 'Please enter email and password');
  }

  // Request bhejte waqt button band karo (double click se bachne ke liye)
  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in...';

  try {
    // Login mein abhi token nahi hai, isliye auth: false
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });

    // Backend ne token aur user diya: browser mein save karo
    saveAuth(data.token, data.user);

    // Dashboard par bhejo
    window.location.href = '/dashboard';
  } catch (error) {
    // Backend ka message (jaise "Invalid email or password") seedha dikhao
    showAlert(alertBox, error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login';
  }
});