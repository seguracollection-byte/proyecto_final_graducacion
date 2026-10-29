const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

function loadMfaConfig() {
  const file = path.join(__dirname, '..', '.env.lomas.local');

  if (!fs.existsSync(file)) {
    throw new Error('Falta el archivo .env.lomas.local');
  }

  const values = dotenv.parse(fs.readFileSync(file));
  const encryptionKey = values.MFA_ENCRYPTION_KEY;

  if (
    typeof encryptionKey !== 'string' ||
    !/^[a-f0-9]{64}$/i.test(encryptionKey)
  ) {
    throw new Error(
      'MFA_ENCRYPTION_KEY debe contener 64 caracteres hexadecimales'
    );
  }

  return {
    encryptionKey: Buffer.from(encryptionKey, 'hex'),
    issuer: 'Lomas Eveneser',
  };
}

module.exports = { loadMfaConfig };