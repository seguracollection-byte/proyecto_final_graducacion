const crypto = require('node:crypto');
const { loadMfaConfig } = require('../config/mfa');

const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';
const CONTEXT = Buffer.from('lomas-eveneser:mfa:totp:v1');

function encryptMfaSecret(secret) {
  if (
    typeof secret !== 'string' ||
    secret.length === 0 ||
    secret.length > 1024
  ) {
    throw new Error('Secreto de MFA inválido');
  }

  const { encryptionKey } = loadMfaConfig();

  // Cada cifrado utiliza un valor aleatorio nuevo.
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    ALGORITHM,
    encryptionKey,
    iv
  );

  cipher.setAAD(CONTEXT);

  const encrypted = Buffer.concat([
    cipher.update(secret, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString('hex'),
    tag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
}

function decryptMfaSecret(value) {
  if (typeof value !== 'string' || value.length > 4096) {
    throw new Error('Secreto cifrado de MFA inválido');
  }

  const parts = value.split(':');

  if (
    parts.length !== 4 ||
    parts[0] !== VERSION ||
    !/^[a-f0-9]{24}$/.test(parts[1]) ||
    !/^[a-f0-9]{32}$/.test(parts[2]) ||
    !/^(?:[a-f0-9]{2})+$/.test(parts[3])
  ) {
    throw new Error('Secreto cifrado de MFA inválido');
  }

  const { encryptionKey } = loadMfaConfig();

  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      encryptionKey,
      Buffer.from(parts[1], 'hex')
    );

    decipher.setAAD(CONTEXT);
    decipher.setAuthTag(Buffer.from(parts[2], 'hex'));

    return Buffer.concat([
      decipher.update(Buffer.from(parts[3], 'hex')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new Error('No se pudo descifrar el secreto de MFA');
  }
}

module.exports = {
  encryptMfaSecret,
  decryptMfaSecret,
};