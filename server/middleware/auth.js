const { store } = require('../lib/mockStore');

// No-auth middleware: always injects the demo user
async function authMiddleware(req, res, next) {
  // Get the demo user (first user in the store)
  const demoUser = store.users.values().next().value;
  req.user = demoUser;
  next();
}

module.exports = authMiddleware;
