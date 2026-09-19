const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { SESSION_SECRET } = require('../config/env');

const storePath = process.env.GITHUB_CONNECTION_STORE
  || path.join(__dirname, '../../../.data/github-connections.json');

function encryptionKey() {
  return crypto.createHash('sha256').update(SESSION_SECRET).digest();
}

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(storePath, 'utf8'));
  } catch {
    return {};
  }
}

function writeStore(store) {
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  const temporaryPath = `${storePath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(store), { mode: 0o600 });
  fs.renameSync(temporaryPath, storePath);
}

function saveGitHubConnection(connection) {
  if (!SESSION_SECRET) throw new Error('SESSION_SECRET es obligatorio para guardar la conexión');

  const store = readStore();
  const key = String(connection.devgotchiId || connection.repository);
  store[key] = {
    devgotchiId: connection.devgotchiId || null,
    repository: connection.repository,
    githubUserId: connection.githubUserId,
    token: encrypt(connection.accessToken),
    refreshToken: connection.refreshToken ? encrypt(connection.refreshToken) : null,
    expiresAt: connection.expiresAt || null,
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
  return { ...store[key], token: undefined, refreshToken: undefined };
}

module.exports = { saveGitHubConnection };
