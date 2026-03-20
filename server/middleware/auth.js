const jwt = require('jsonwebtoken');
const config = require('../config');
const { store } = require('../lib/mockStore');

function isLocalMode() {
  return process.env.LOCAL_MODE === 'true';
}

async function authMiddleware(req, res, next) {
  if (isLocalMode()) {
    const demoUser = store.users.values().next().value;
    req.user = { id: demoUser.id, email: demoUser.email };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = { id: decoded.userId, email: decoded.email };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authMiddleware;
