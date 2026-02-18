// Configuration
const CONFIG = {
  API_BASE_URL: '/api',
  LOCAL_MODE: true // Set to false when using Supabase
};

// Session storage for local mode
const localSession = {
  token: localStorage.getItem('auth_token'),
  user: JSON.parse(localStorage.getItem('auth_user') || 'null'),

  set(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  },

  clear() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  },

  getSession() {
    if (this.token && this.user) {
      return { access_token: this.token, user: this.user };
    }
    return null;
  }
};

// Mock supabase object for compatibility
const supabase = {
  auth: {
    async getSession() {
      const session = localSession.getSession();
      return { data: { session } };
    },
    async signInWithPassword({ email, password }) {
      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) {
          return { data: null, error: { message: data.error } };
        }
        localSession.set(data.session.access_token, data.user);
        return { data: { user: data.user, session: data.session }, error: null };
      } catch (error) {
        return { data: null, error: { message: 'Network error' } };
      }
    },
    async signUp({ email, password, options }) {
      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            name: options?.data?.full_name
          })
        });
        const data = await response.json();
        if (!response.ok) {
          return { data: null, error: { message: data.error } };
        }
        localSession.set(data.session.access_token, data.user);
        return { data: { user: data.user, session: data.session }, error: null };
      } catch (error) {
        return { data: null, error: { message: 'Network error' } };
      }
    },
    async signOut() {
      const token = localSession.token;
      localSession.clear();
      if (token) {
        try {
          await fetch(`${CONFIG.API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
        } catch (error) {
          // Ignore logout errors
        }
      }
      return { error: null };
    }
  }
};
