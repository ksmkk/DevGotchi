const crypto = require('node:crypto');
const {
  GITHUB_CALLBACK_URL,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  SESSION_SECRET,
} = require('../config/env');

const OAUTH_COOKIE = 'devgotchi_github_oauth';
const OAUTH_COOKIE_MAX_AGE = 600;

function requireOAuthConfig() {
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !GITHUB_CALLBACK_URL || !SESSION_SECRET) {
    const error = new Error('La configuración OAuth de GitHub está incompleta');
    error.statusCode = 503;
    throw error;
  }
}

function base64Url(value) {
  return value.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createSignedOAuthState() {
  const state = base64Url(crypto.randomBytes(32));
  const codeVerifier = base64Url(crypto.randomBytes(32));
  const payload = base64Url(Buffer.from(JSON.stringify({ state, codeVerifier })));
  const signature = base64Url(crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest());

  return {
    state,
    codeVerifier,
    cookieValue: `${payload}.${signature}`,
  };
}

function parseCookies(header = '') {
  return header.split(';').reduce((cookies, part) => {
    const separator = part.indexOf('=');
    if (separator === -1) return cookies;

    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    cookies[name] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function readSignedOAuthState(header) {
  const value = parseCookies(header)[OAUTH_COOKIE];
  if (!value) return null;

  const [payload, encodedSignature] = value.split('.');
  if (!payload || !encodedSignature) return null;

  const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest();
  const actualSignature = Buffer.from(encodedSignature.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  if (actualSignature.length !== expectedSignature.length
    || !crypto.timingSafeEqual(actualSignature, expectedSignature)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function setOAuthCookie(res, cookieValue) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${OAUTH_COOKIE}=${encodeURIComponent(cookieValue)}; HttpOnly; SameSite=Lax; Path=/api/auth/github; Max-Age=${OAUTH_COOKIE_MAX_AGE}${secure}`,
  );
}

function clearOAuthCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${OAUTH_COOKIE}=; HttpOnly; SameSite=Lax; Path=/api/auth/github; Max-Age=0`,
  );
}

function buildAuthorizationUrl(state, codeChallenge) {
  const url = new URL('https://github.com/login/oauth/authorize');
  url.search = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_CALLBACK_URL,
    response_type: 'code',
    scope: 'read:user',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return url.toString();
}

function createOAuthTokenRecord(token) {
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token || null,
    expiresAt: token.expires_in
      ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString()
      : null,
  };
}

async function exchangeCode(code, codeVerifier) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'DevGotchi',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: GITHUB_CALLBACK_URL,
      code_verifier: codeVerifier,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    const error = new Error('GitHub rechazó el intercambio OAuth');
    error.statusCode = 502;
    throw error;
  }

  return createOAuthTokenRecord(data);
}

async function getGitHubUser(accessToken) {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'DevGotchi',
    },
  });

  if (!response.ok) {
    const error = new Error('GitHub rechazó la consulta del usuario');
    error.statusCode = 502;
    throw error;
  }

  const user = await response.json();
  return {
    id: user.id,
    login: user.login,
    name: user.name || null,
  };
}

function startGitHubOAuth(req, res) {
  requireOAuthConfig();
  const cookie = createSignedOAuthState();
  setOAuthCookie(res, cookie.cookieValue);
  return res.redirect(buildAuthorizationUrl(cookie.state, base64Url(
    crypto.createHash('sha256').update(cookie.codeVerifier).digest(),
  )));
}

async function completeGitHubOAuth(req, res) {
  requireOAuthConfig();
  const stored = readSignedOAuthState(req.headers.cookie);
  clearOAuthCookie(res);

  const requestedState = Buffer.from(String(req.query.state || ''));
  const storedState = Buffer.from(stored?.state || '');
  if (!stored || !req.query.state || storedState.length !== requestedState.length
    || !crypto.timingSafeEqual(storedState, requestedState)) {
    return res.status(401).json({ error: 'Estado OAuth inválido' });
  }

  if (!req.query.code) {
    return res.status(400).json({ error: 'Falta el código OAuth de GitHub' });
  }

  try {
    const token = await exchangeCode(String(req.query.code), stored.codeVerifier);
    const user = await getGitHubUser(token.accessToken);
    return res.status(200).json({ connected: true, user });
  } catch (error) {
    return res.status(error.statusCode || 502).json({ error: error.message });
  }
}

module.exports = {
  completeGitHubOAuth,
  OAUTH_COOKIE,
  readSignedOAuthState,
  startGitHubOAuth,
};