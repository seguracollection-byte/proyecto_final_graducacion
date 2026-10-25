const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

function buildActivationLink(token) {
  if (
    typeof token !== 'string' ||
    !/^[a-f0-9]{64}$/.test(token)
  ) {
    throw new Error('Token de activación inválido');
  }

  const file = path.join(__dirname, '..', '.env.lomas.local');
  const values = dotenv.parse(fs.readFileSync(file));
  const url = new URL(values.ACTIVATION_PAGE_URL);

  // Restricción temporal para el desarrollo local.
  if (
    url.protocol !== 'http:' ||
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    url.port !== '8082' ||
    url.pathname !== '/activar' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error('Dirección de activación local incorrecta');
  }

  url.hash = new URLSearchParams({ token }).toString();

  return url.toString();
}

module.exports = { buildActivationLink };