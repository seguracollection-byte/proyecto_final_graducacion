const jwt = require('jsonwebtoken');
const { loadAuthConfig } = require('../config/auth');

function createAccessToken(user) {
  if (
    !Number.isSafeInteger(user.id) ||
    user.id <= 0 ||
    !Number.isSafeInteger(user.version_sesion) ||
    user.version_sesion <= 0
  ) {
    throw new Error('Datos de sesión inválidos');
  }

  const config = loadAuthConfig();

  return jwt.sign(
    { version_sesion: user.version_sesion },
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
    !Number.isInteger(payload.exp)
  ) {
    throw new Error('Contenido del token inválido');
  }

  return {
    userId: Number(payload.sub),
    sessionVersion: payload.version_sesion,
  };
}

module.exports = { createAccessToken, verifyAccessToken };