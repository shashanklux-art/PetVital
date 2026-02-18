const express = require('express');
const router = express.Router();
const { mockAuth, mockDb } = require('../lib/mockStore');
const authMiddleware = require('../middleware/auth');

// Evaluate at runtime to ensure dotenv has loaded
function isLocalMode() {
  return process.env.LOCAL_MODE === 'true';
}

// Signup (local mode only)
router.post('/signup', async (req, res) => {
  if (!isLocalMode()) {
    return res.status(400).json({ error: 'Use Supabase client for signup' });
  }

  try {
    const { email, password, name } = req.body;

    const { data, error } = await mockAuth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      user: data.user,
      session: data.session
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to sign up' });
  }
});

// Login (local mode only)
router.post('/login', async (req, res) => {
  if (!isLocalMode()) {
    return res.status(400).json({ error: 'Use Supabase client for login' });
  }

  try {
    const { email, password } = req.body;

    const { data, error } = await mockAuth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      user: data.user,
      session: data.session
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Logout (local mode only)
router.post('/logout', async (req, res) => {
  if (!isLocalMode()) {
    return res.status(400).json({ error: 'Use Supabase client for logout' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    await mockAuth.signOut(token);
  }
  res.json({ message: 'Logged out' });
});

// Get current user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    if (isLocalMode()) {
      const { data: profile, error } = await mockDb.profiles.select(req.user.id);
      if (error) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      res.json({ profile });
    } else {
      const { supabase } = require('../lib/supabase');
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', req.user.id)
        .single();

      if (error) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      res.json({ profile });
    }
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
        full_name,
        preferred_language
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      res.json({ profile });
    } else {
      const { supabase } = require('../lib/supabase');
      const { data: profile, error } = await supabase
        .from('profiles')
        .update({ full_name, preferred_language })
        .eq('id', req.user.id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      res.json({ profile });
    }
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
