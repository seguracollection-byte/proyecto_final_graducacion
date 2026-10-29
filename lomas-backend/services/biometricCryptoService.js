const crypto = require('node:crypto');

function decodeBase64(value, maxLength) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > maxLength ||
    value.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(value)
  ) {
    throw new Error('Contenido criptográfico inválido');
  }

  const decoded = Buffer.from(value, 'base64');

  if (decoded.toString('base64') !== value) {
    throw new Error('Contenido criptográfico inválido');
  }

  return decoded;
}

function normalizeBiometricPublicKey(publicKey) {
  const encoded = decodeBase64(publicKey, 1024);

  const key = crypto.createPublicKey({
    key: encoded,
    format: 'der',
    type: 'spki',
  });

  if (
    key.asymmetricKeyType !== 'rsa' ||
    key.asymmetricKeyDetails?.modulusLength !== 2048 ||
    key.asymmetricKeyDetails?.publicExponent !== 65537n
  ) {
    throw new Error('La clave debe ser RSA de 2048 bits');
  }

  const canonical = key.export({
    format: 'der',
    type: 'spki',
  });

  return {
    publicKey: canonical.toString('base64'),
    fingerprint: crypto
      .createHash('sha256')
      .update(canonical)
      .digest('hex'),
  };
}

function verifyBiometricSignature({
  publicKey,
  message,
  signature,
}) {
  if (
    typeof message !== 'string' ||
    message.length === 0 ||
    message.length > 1024 ||
    !/^[\x20-\x7E]+$/.test(message)
  ) {
    return false;
  }

  try {
    const normalized = normalizeBiometricPublicKey(
      publicKey
    );

    const signatureBytes = decodeBase64(
      signature,
      512
    );

    if (signatureBytes.length !== 256) {
      return false;
    }

    const key = crypto.createPublicKey({
      key: Buffer.from(normalized.publicKey, 'base64'),
      format: 'der',
      type: 'spki',
    });

    return crypto.verify(
      'sha256',
      Buffer.from(message, 'utf8'),
      {
        key,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      signatureBytes
    );
  } catch {
    return false;
  }
}

module.exports = {
  normalizeBiometricPublicKey,
  verifyBiometricSignature,
};