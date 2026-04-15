const { verifyAuthToken } = require('../utils/authToken');

function requireAuth(req, res, next) {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const payload = verifyAuthToken(match[1]);
  if (!payload) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  req.user = payload;
  return next();
}

module.exports = {
  requireAuth,
};
