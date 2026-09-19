// frontend/js/register.js

// Pehle se login hai to register page dikhane ka koi matlab nahi
redirectIfLoggedIn();

const form = document.getElementById('registerForm');
const alertBox = document.getElementById('alertBox');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (event) => {
  // Form ka default behaviour (page reload) roko
  event.preventDefault();
  hideAlert(alertBox);

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  // Basic checks (asli validation backend bhi karta hai, ye sirf jaldi feedback ke liye)
  if (!name || !email || !password || !confirmPassword) {
    return showAlert(alertBox, 'Please fill in all fields');
  }

  if (name.length < 2) {
    return showAlert(alertBox, 'Name must be at least 2 characters');
  }

  if (password.length < 6) {
    return showAlert(alertBox, 'Password must be at least 6 characters');
  }

  if (password !== confirmPassword) {
    return showAlert(alertBox, 'Passwords do not match');
  }

  // Request bhejte waqt button band karo (double click se bachne ke liye)
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account...';

  try {
    // Register mein token nahi bhejna, isliye auth: false
    await apiRequest('/auth/register', {
      method: 'POST',
      body: { name, email, password },
      auth: false,
    });

    showAlert(alertBox, 'Registration successful! Redirecting to login...', 'success');

    // 1.5 second baad login page par bhej do
    setTimeout(() => {
      window.location.href = '/login';
    }, 1500);
  } catch (error) {
    // Backend ka message (jaise "Email is already registered") seedha dikhao
    showAlert(alertBox, error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Register';
  }
});