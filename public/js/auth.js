// Authentication with JWT token management

async function checkAuth() {
  const token = localStorage.getItem('auth_token');
  if (token) {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        window.location.href = '/dashboard.html';
      } else {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    } catch (e) {
      // Network error, don't redirect
    }
  }
}

async function requireAuth() {
  const token = localStorage.getItem('auth_token');
  const user = JSON.parse(localStorage.getItem('auth_user') || 'null');

  if (!token || !user) {
    window.location.href = '/login.html';
    return null;
  }

  return { access_token: token, user };
}

async function logout() {
  const token = localStorage.getItem('auth_token');
  if (token) {
    try {
      await fetch(`${CONFIG.API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) { /* ignore */ }
  }
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  window.location.href = '/login.html';
}

// Login form handler
const loginForm = document.getElementById('login-form');
if (loginForm) {
  checkAuth();
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('form-error');
    const submitBtn = document.getElementById('submit-btn');

    errorEl.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').style.display = 'none';
    submitBtn.querySelector('.btn-loading').style.display = 'inline';

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      localStorage.setItem('auth_token', data.session.access_token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      window.location.href = '/dashboard.html';
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('.btn-text').style.display = 'inline';
      submitBtn.querySelector('.btn-loading').style.display = 'none';
    }
  });
}

// Signup form handler
const signupForm = document.getElementById('signup-form');
if (signupForm) {
  checkAuth();
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errorEl = document.getElementById('form-error');
    const submitBtn = document.getElementById('submit-btn');

    if (password !== confirmPassword) {
      errorEl.textContent = 'Passwords do not match';
      errorEl.style.display = 'block';
      return;
    }

    errorEl.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').style.display = 'none';
    submitBtn.querySelector('.btn-loading').style.display = 'inline';

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }
      localStorage.setItem('auth_token', data.session.access_token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      window.location.href = '/dashboard.html';
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('.btn-text').style.display = 'inline';
      submitBtn.querySelector('.btn-loading').style.display = 'none';
    }
  });
}

// Attach logout handlers
document.getElementById('logout-btn')?.addEventListener('click', logout);
document.getElementById('mobile-logout-btn')?.addEventListener('click', logout);
