const crypto = require('node:crypto');
const { SESSION_SECRET } = require('../config/env');

const SESSION_COOKIE = 'devgotchi_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 365;
const runtimeSecret = SESSION_SECRET || crypto.randomBytes(32).toString('base64url');

function parseCookies(header = '') {
  return header.split(';').reduce((cookies, item) => {
    const separator = item.indexOf('=');
    if (separator < 0) return cookies;
    cookies[item.slice(0, separator).trim()] = decodeURIComponent(item.slice(separator + 1).trim());
    return cookies;
  }, {});
}

function signature(value) {
  return crypto.createHmac('sha256', runtimeSecret).update(value).digest('base64url');
}

function readSessionId(cookieHeader) {
  const cookie = parseCookies(cookieHeader)[SESSION_COOKIE];
  if (!cookie) return null;
  const [sessionId, suppliedSignature] = cookie.split('.');
  if (!sessionId || !suppliedSignature || !/^[a-f0-9-]{36}$/i.test(sessionId)) return null;
  const expected = Buffer.from(signature(sessionId));
  const supplied = Buffer.from(suppliedSignature);
  return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied)
    ? sessionId
    : null;
}

function appendCookie(res, value) {
  const current = res.getHeader('Set-Cookie');
  const values = current ? (Array.isArray(current) ? current : [current]) : [];
  res.setHeader('Set-Cookie', [...values, value]);
}

function ensureSessionIdentity(req, res, next) {
  let sessionId = readSessionId(req.headers.cookie);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    appendCookie(
      res,
      `${SESSION_COOKIE}=${sessionId}.${signature(sessionId)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}${secure}`,
    );
  }
  req.devgotchiSessionId = sessionId;
  next();
}

module.exports = { ensureSessionIdentity, readSessionId, SESSION_COOKIE };
