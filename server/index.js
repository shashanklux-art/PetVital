const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const config = require('./config');
const authRoutes = require('./routes/auth');
const petsRoutes = require('./routes/pets');
const triageRoutes = require('./routes/triage');
const journalRoutes = require('./routes/journal');
const vetsRoutes = require('./routes/vets');
const exportRoutes = require('./routes/export');

const app = express();

// Trust proxy (required for Vercel / reverse proxies)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.SUPABASE_URL || "https://*.supabase.co"]
    }
  }
}));

app.use(cors());
app.use(express.json());

// Rate limiting (disabled validation for serverless compatibility)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  validate: false
});

const triageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.LOCAL_MODE === 'true' ? 100 : 20,
  message: { error: 'Triage limit reached. Please try again later.' },
  validate: false
});

app.use('/api/', apiLimiter);
// Only apply triage rate limit in production
if (process.env.LOCAL_MODE !== 'true') {
  app.use('/api/triage', triageLimiter);
}

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/pets', petsRoutes);
app.use('/api/triage', triageRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/vets', vetsRoutes);
app.use('/api/export', exportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), localMode: process.env.LOCAL_MODE });
});

// Serve index.html for all non-API routes (SPA fallback)
app.get('/{*path}', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Export app for Vercel serverless function
module.exports = app;

// Start server only when run directly (not imported by Vercel)
if (require.main === module) {
  const PORT = config.port;
  app.listen(PORT, () => {
    console.log(`PetVital server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT}`);
  });
}
