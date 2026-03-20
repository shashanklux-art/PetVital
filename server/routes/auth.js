const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { getDb } = require('../lib/db');
const { mockAuth, mockDb } = require('../lib/mockStore');
const authMiddleware = require('../middleware/auth');

function isLocalMode() {
  return process.env.LOCAL_MODE === 'true';
}

function generateToken(userId, email) {
  return jwt.sign(
    { userId, email },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (isLocalMode()) {
      const { data, error } = await mockAuth.signUp({
        email, password,
        options: { data: { full_name: name } }
      });
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ user: data.user, session: data.session });
    }

    const sql = getDb();

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [user] = await sql`
      INSERT INTO users (email, password_hash, full_name)
      VALUES (${email}, ${passwordHash}, ${name || null})
      RETURNING id, email, full_name, created_at
    `;

    const token = generateToken(user.id, user.email);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        user_metadata: { full_name: user.full_name }
      },
      session: { access_token: token }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to sign up' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (isLocalMode()) {
      const { data, error } = await mockAuth.signInWithPassword({ email, password });
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ user: data.user, session: data.session });
    }

    const sql = getDb();
    const [user] = await sql`
      SELECT id, email, password_hash, full_name
      FROM users WHERE email = ${email}
    `;

    if (!user) {
      return res.status(400).json({ error: 'Invalid login credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid login credentials' });
    }

    const token = generateToken(user.id, user.email);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        user_metadata: { full_name: user.full_name }
      },
      session: { access_token: token }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  if (isLocalMode()) {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) mockAuth.signOut(token);
  }
  res.json({ message: 'Logged out' });
});

// Get current user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    if (isLocalMode()) {
      const { data: profile } = await mockDb.profiles.select(req.user.id);
      if (!profile) return res.status(404).json({ error: 'Profile not found' });
      return res.json({ profile });
    }

    const sql = getDb();
    const [profile] = await sql`
      SELECT id, email, full_name, preferred_language, created_at
      FROM users WHERE id = ${req.user.id}
    `;

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json({ profile });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { full_name, preferred_language } = req.body;

    if (isLocalMode()) {
      const { data: profile, error } = await mockDb.profiles.update(req.user.id, {
        full_name, preferred_language
      });
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ profile });
    }

    const sql = getDb();
    const [profile] = await sql`
      UPDATE users
      SET full_name = COALESCE(${full_name || null}, full_name),
          preferred_language = COALESCE(${preferred_language || null}, preferred_language)
      WHERE id = ${req.user.id}
      RETURNING id, email, full_name, preferred_language, created_at
    `;

    if (!profile) {
      return res.status(400).json({ error: 'Update failed' });
    }
    res.json({ profile });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
