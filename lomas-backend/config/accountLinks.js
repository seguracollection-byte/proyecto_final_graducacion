const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

function buildAccountLink(token, variableName, expectedPath) {
  if (
    typeof token !== 'string' ||
    !/^[a-f0-9]{64}$/.test(token)
  ) {
    throw new Error('Token de cuenta inválido');
  }

  const file = path.join(__dirname, '..', '.env.lomas.local');
  const values = dotenv.parse(fs.readFileSync(file));
  const configuredUrl = values[variableName];

  if (!configuredUrl) {
    throw new Error(`Falta configurar ${variableName}`);
  }

  const url = new URL(configuredUrl);

  // Restricción temporal para el desarrollo local.
  if (
    url.protocol !== 'http:' ||
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    url.port !== '8082' ||
    url.pathname !== expectedPath ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error('Dirección local de cuenta incorrecta');
  }

  url.hash = new URLSearchParams({ token }).toString();

  return url.toString();
}

function buildActivationLink(token) {
  return buildAccountLink(
    token,
    'ACTIVATION_PAGE_URL',
    '/activar'
  );
}

function buildRecoveryLink(token) {
  return buildAccountLink(
    token,
    'RECOVERY_PAGE_URL',
    '/restablecer'
  );
}

module.exports = {
  buildActivationLink,
  buildRecoveryLink,
};