const crypto = require('crypto');

const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || 'certificate-local-secret';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

function encodePayload(payload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodePayload(tokenPart) {
  try {
    const json = Buffer.from(String(tokenPart || ''), 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function signToken(payload) {
  const body = encodePayload(payload);
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(body)
    .digest('base64url');
  return `${body}.${signature}`;
}

function createAuthToken(user) {
  const now = Date.now();
  const payload = {
    id: user.id,
    username: user.username,
    name: user.name || user.username,
    iat: now,
    exp: now + TOKEN_TTL_MS,
  };
  return signToken(payload);
}

function verifyAuthToken(token) {
  const [body, signature] = String(token || '').split('.');
  if (!body || !signature) return null;

  const expected = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(body)
    .digest('base64url');

  if (expected !== signature) return null;

  const payload = decodePayload(body);
  if (!payload || typeof payload !== 'object') return null;
  if (!payload.exp || Date.now() > payload.exp) return null;

  return payload;
}

module.exports = {
  createAuthToken,
  verifyAuthToken,
};
