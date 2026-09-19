const crypto = require('node:crypto');
const {
  GITHUB_CALLBACK_URL,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GITHUB_WEBHOOK_SECRET,
  SESSION_SECRET,
} = require('../config/env');
const { saveGitHubConnection } = require('./githubConnectionStore');

const OAUTH_COOKIE = 'devgotchi_github_oauth';
const OAUTH_COOKIE_MAX_AGE = 600;
const GITHUB_WEBHOOK_EVENTS = [
  'workflow_run',
  'check_suite',
  'deployment_status',
  'dependabot_alert',
  'code_scanning_alert',
  'secret_scanning_alert',
  'branch_protection_rule',
];

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
    scope: 'read:user repo:status write:repo_hook',
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

function parseRepository(value) {
  const match = String(value || '').trim().match(/^([^/]+)\/([^/]+)$/);
  if (!match || !/^[A-Za-z0-9_.-]+$/.test(match[1]) || !/^[A-Za-z0-9_.-]+$/.test(match[2])) {
    return null;
  }
  return { owner: match[1], name: match[2] };
}

async function getGitHubRepository(accessToken, repository) {
  const response = await fetch(`https://api.github.com/repos/${repository.owner}/${repository.name}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'DevGotchi',
    },
  });
  if (!response.ok) {
    const error = new Error('GitHub rechazó el repositorio solicitado');
    error.statusCode = 502;
    throw error;
  }
  return response.json();
}

async function registerRepositoryWebhook(accessToken, repository) {
  const webhookUrl = process.env.GITHUB_WEBHOOK_URL;
  if (!webhookUrl || !GITHUB_WEBHOOK_SECRET) {
    const error = new Error('GITHUB_WEBHOOK_URL y GITHUB_WEBHOOK_SECRET son obligatorios');
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch(`https://api.github.com/repos/${repository.owner}/${repository.name}/hooks`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'DevGotchi',
    },
    body: JSON.stringify({
      name: 'web',
      active: true,
      events: GITHUB_WEBHOOK_EVENTS,
      config: {
        url: webhookUrl,
        content_type: 'json',
        insecure_ssl: '0',
        secret: GITHUB_WEBHOOK_SECRET,
      },
    }),
  });
  if (!response.ok) {
    const error = new Error('GitHub rechazó el registro del webhook');
    error.statusCode = 502;
    throw error;
  }
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
    const repository = parseRepository(req.query.repository);
    let repositoryData;
    if (req.query.repository && !repository) {
      return res.status(400).json({ error: 'Repositorio de GitHub inválido' });
    }

    if (repository) {
      repositoryData = await getGitHubRepository(token.accessToken, repository);
      await registerRepositoryWebhook(token.accessToken, repository);
      saveGitHubConnection({
        accessToken: token.accessToken,
        devgotchiId: req.query.devgotchi_id,
        expiresAt: token.expiresAt,
        githubUserId: user.id,
        refreshToken: token.refreshToken,
        repository: repositoryData.full_name || `${repository.owner}/${repository.name}`,
      });
    }

    return res.status(200).json({
      connected: true,
      ...(repository ? { repository: repositoryData.full_name } : {}),
      user,
    });
  } catch (error) {
    return res.status(error.statusCode || 502).json({ error: error.message });
  }
}

module.exports = {
  completeGitHubOAuth,
  OAUTH_COOKIE,
  GITHUB_WEBHOOK_EVENTS,
  getGitHubRepository,
  registerRepositoryWebhook,
  readSignedOAuthState,
  startGitHubOAuth,
};