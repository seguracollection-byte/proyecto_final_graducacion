const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');

test('firma sesiones MFA y rechaza tokens anteriores o inválidos', () => {
  const originalLoader = authConfig.loadAuthConfig;
  const servicePath = require.resolve('../services/tokenService');

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

    const user = {
      id: 1,
      version_sesion: 1,
    };

    for (const method of ['otp', 'biometric', 'recovery']) {
      const token = createAccessToken(user, method);

      assert.deepEqual(verifyAccessToken(token), {
        userId: 1,
        sessionVersion: 1,
      });

      const payload = jwt.decode(token);

      assert.equal(payload.mfa, true);
      assert.equal(payload.token_use, 'access');
      assert.deepEqual(payload.amr, ['pwd', method]);
    }

    assert.deepEqual(
      jwt.decode(createAccessToken(user)).amr,
      ['pwd', 'otp']
    );

    function signedToken({
      claims = {},
      options = {},
      secret = config.secret,
      legacy = false,
    } = {}) {
      return jwt.sign(
        legacy
          ? { version_sesion: 1 }
          : {
            version_sesion: 1,
            token_use: 'access',
            mfa: true,
            amr: ['pwd', 'otp'],
            ...claims,
          },
        secret,
        {
          algorithm: 'HS256',
          issuer: config.issuer,
          audience: config.audience,
          subject: '1',
          expiresIn: '1h',
          ...options,
        }
      );
    }

    assert.throws(() =>
      verifyAccessToken(signedToken({ legacy: true }))
    );

    for (const claims of [
      { mfa: false },
      { mfa: 'true' },
      { token_use: 'challenge' },
      { amr: ['pwd'] },
      { amr: ['otp'] },
      { amr: ['biometric'] },
      { amr: ['pwd', 'pwd'] },
      { amr: ['pwd', 'desconocido'] },
      { amr: ['pwd', 'otp', 'biometric'] },
      { amr: null },
      { version_sesion: 0 },
    ]) {
      assert.throws(() =>
        verifyAccessToken(signedToken({ claims }))
      );
    }

    for (const options of [
      { expiresIn: -1 },
      { issuer: 'otro-servidor' },
      { audience: 'otra-app' },
      { algorithm: 'HS384' },
      { subject: '0' },
    ]) {
      assert.throws(() =>
        verifyAccessToken(signedToken({ options }))
      );
    }

    assert.throws(() =>
      verifyAccessToken(
        signedToken({ secret: 'b'.repeat(96) })
      )
    );

    const token = createAccessToken(user);
    const parts = token.split('.');
    const payload = jwt.decode(token);

    parts[1] = Buffer
      .from(JSON.stringify({
        ...payload,
        sub: '999',
        amr: ['pwd', 'biometric'],
      }))
      .toString('base64url');

    assert.throws(() =>
      verifyAccessToken(parts.join('.'))
    );

    assert.throws(() =>
      verifyAccessToken('token-invalido')
    );

    assert.throws(() =>
      createAccessToken({ id: 0, version_sesion: 1 })
    );

    assert.throws(() =>
      createAccessToken({ id: 1, version_sesion: 0 })
    );

    assert.throws(() =>
      createAccessToken(user, 'desconocido')
    );
  } finally {
    authConfig.loadAuthConfig = originalLoader;
    delete require.cache[servicePath];
  }
});