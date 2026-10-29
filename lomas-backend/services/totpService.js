const OTPAuth = require('otpauth');
const { loadMfaConfig } = require('../config/mfa');

const PERIOD_SECONDS = 30;
const DIGITS = 6;

function createTotp(secret) {
  if (
    typeof secret !== 'string' ||
    !/^[A-Z2-7]{32}$/.test(secret)
  ) {
    throw new Error('Secreto de Authenticator inválido');
  }

  return new OTPAuth.TOTP({
    algorithm: 'SHA1',
    digits: DIGITS,
    period: PERIOD_SECONDS,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

function createTotpEnrollment(email) {
  if (
    typeof email !== 'string' ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error('Correo de vinculación inválido');
  }

  const { issuer } = loadMfaConfig();
  const secret = new OTPAuth.Secret({ size: 20 });

  const totp = new OTPAuth.TOTP({
    issuer,
    label: email.trim().toLowerCase(),
    algorithm: 'SHA1',
    digits: DIGITS,
    period: PERIOD_SECONDS,
    secret,
  });

  return {
    secret: secret.base32,
    uri: totp.toString(),
  };
}

function verifyTotpCode({
  secret,
  code,
  lastUsedStep = null,
  timestamp = Date.now(),
}) {
  if (
    typeof code !== 'string' ||
    !/^\d{6}$/.test(code)
  ) {
    return null;
  }

  if (
    !Number.isSafeInteger(timestamp) ||
    timestamp < 0
  ) {
    throw new Error('Fecha de verificación inválida');
  }

  if (
    lastUsedStep !== null &&
    (
      !Number.isSafeInteger(lastUsedStep) ||
      lastUsedStep < 0
    )
  ) {
    throw new Error('Paso anterior de Authenticator inválido');
  }

  const totp = createTotp(secret);

  // Acepta una diferencia de un período entre los relojes.
  const delta = totp.validate({
    token: code,
    timestamp,
    window: 1,
  });

  if (delta === null) {
    return null;
  }

  const step = totp.counter({ timestamp }) + delta;

  // Rechaza períodos ya utilizados.
  if (
    step < 0 ||
    (lastUsedStep !== null && step <= lastUsedStep)
  ) {
    return null;
  }

  return step;
}

module.exports = {
  createTotpEnrollment,
  verifyTotpCode,
};