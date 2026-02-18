// Auth disabled for MVP — always returns demo session

async function checkAuth() {
  // No-op: don't redirect away from login/signup pages
}

async function requireAuth() {
  return { access_token: 'demo', user: { email: 'demo@petvital.app', user_metadata: { full_name: 'Demo User' } } };
}

async function logout() {
  window.location.href = '/';
}

// Attach logout handlers
document.getElementById('logout-btn')?.addEventListener('click', logout);
document.getElementById('mobile-logout-btn')?.addEventListener('click', logout);
