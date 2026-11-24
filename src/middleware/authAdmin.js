const crypto = require('node:crypto');
const config = require('../config/env');

function toBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function fromBase64Url(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signAdminToken(adminUser) {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = {
    sub: adminUser.id,
    usuario: adminUser.usuario,
    nombre: adminUser.nombre,
    iat: nowSec,
    exp: nowSec + config.admin.tokenTtlSeconds,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', config.admin.secret)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function verifyAdminToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return null;
  }
  const [encodedPayload, providedSig] = token.split('.');
  if (!encodedPayload || !providedSig) {
    return null;
  }

  const expectedSig = crypto
    .createHmac('sha256', config.admin.secret)
    .update(encodedPayload)
    .digest('base64url');

  const providedBuf = Buffer.from(providedSig);
  const expectedBuf = Buffer.from(expectedSig);
  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function requireAdminAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const decoded = verifyAdminToken(token);
  if (!decoded) {
    return res.status(401).json({
      ok: false,
      error: 'Sesión administrativa expirada o no autorizada.',
    });
  }
  req.admin = decoded;
  return next();
}

module.exports = { signAdminToken, verifyAdminToken, requireAdminAuth };
