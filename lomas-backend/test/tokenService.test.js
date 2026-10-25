const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');

test('firma y verifica tokens con configuración ficticia', () => {
  const originalLoader = authConfig.loadAuthConfig;
  const servicePath = require.resolve('../services/tokenService');

  // Clave pública de prueba: nunca usar en la aplicación.
  const config = {
    secret: 'a'.repeat(96),
    expiresIn: '1h',
    algorithm: 'HS256',
    issuer: 'lomas-eveneser-api',
    audience: 'lomas-eveneser-app',
  };

  authConfig.loadAuthConfig = () => config;
  delete require.cache[servicePath];

  try {
    const {
      createAccessToken,
      verifyAccessToken,
    } = require('../services/tokenService');

    const token = createAccessToken({
      id: 1,
      version_sesion: 1,
    });

    assert.deepEqual(verifyAccessToken(token), {
      userId: 1,
      sessionVersion: 1,
    });

    function signedToken(overrides = {}, secret = config.secret) {
      return jwt.sign(
        { version_sesion: 1 },
        secret,
        {
          algorithm: 'HS256',
          issuer: config.issuer,
          audience: config.audience,
          subject: '1',
          expiresIn: '1h',
          ...overrides,
        }
      );
    }

    assert.throws(() =>
      verifyAccessToken(signedToken({ expiresIn: -1 }))
    );

    assert.throws(() =>
      verifyAccessToken(signedToken({}, 'b'.repeat(96)))
    );

    assert.throws(() =>
      verifyAccessToken(signedToken({ issuer: 'otro-servidor' }))
    );

    assert.throws(() =>
      verifyAccessToken(signedToken({ audience: 'otra-app' }))
    );

    assert.throws(() =>
      verifyAccessToken(signedToken({ algorithm: 'HS384' }))
    );

    assert.throws(() => verifyAccessToken('token-invalido'));

    assert.throws(() =>
      createAccessToken({ id: 0, version_sesion: 1 })
    );

    assert.throws(() =>
      createAccessToken({ id: 1, version_sesion: 0 })
    );
  } finally {
    authConfig.loadAuthConfig = originalLoader;
    delete require.cache[servicePath];
  }
});