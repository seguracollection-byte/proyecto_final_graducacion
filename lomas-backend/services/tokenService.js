const jwt = require('jsonwebtoken');
const { loadAuthConfig } = require('../config/auth');

const SECOND_FACTORS = ['otp', 'biometric', 'recovery'];

function createAccessToken(user, secondFactor = 'otp') {
  if (
    !user ||
    !Number.isSafeInteger(user.id) ||
    user.id <= 0 ||
    !Number.isSafeInteger(user.version_sesion) ||
    user.version_sesion <= 0 ||
    !SECOND_FACTORS.includes(secondFactor)
  ) {
    throw new Error('Datos de sesión inválidos');
  }

  const config = loadAuthConfig();

  // El backend selecciona el método después de verificarlo.
  // Nunca tomar este valor directamente del cuerpo de la petición.
  return jwt.sign(
    {
      version_sesion: user.version_sesion,
      token_use: 'access',
      mfa: true,
      amr: ['pwd', secondFactor],
    },
    config.secret,
    {
      algorithm: config.algorithm,
      expiresIn: config.expiresIn,
      issuer: config.issuer,
      audience: config.audience,
      subject: String(user.id),
    }
  );
}

function verifyAccessToken(token) {
  const config = loadAuthConfig();

  const payload = jwt.verify(token, config.secret, {
    algorithms: [config.algorithm],
    issuer: config.issuer,
    audience: config.audience,
  });

  if (
    typeof payload !== 'object' ||
    payload === null ||
    !/^[1-9]\d*$/.test(payload.sub || '') ||
    !Number.isSafeInteger(Number(payload.sub)) ||
    !Number.isSafeInteger(payload.version_sesion) ||
    payload.version_sesion <= 0 ||
    !Number.isInteger(payload.exp) ||
    payload.token_use !== 'access' ||
    payload.mfa !== true ||
    !Array.isArray(payload.amr) ||
    payload.amr.length !== 2 ||
    !payload.amr.includes('pwd') ||
    !SECOND_FACTORS.some(
      (factor) => payload.amr.includes(factor)
    )
  ) {
    throw new Error('Contenido del token inválido');
  }

  return {
    userId: Number(payload.sub),
    sessionVersion: payload.version_sesion,
  };
}

module.exports = {
  createAccessToken,
  verifyAccessToken,
};