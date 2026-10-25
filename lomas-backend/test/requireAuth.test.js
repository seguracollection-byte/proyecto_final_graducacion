const { test } = require('node:test');
const assert = require('node:assert/strict');

const tokens = require('../services/tokenService');
const database = require('../config/lomasDatabase');

test('protege el acceso y comprueba la cuenta actual', async () => {
  const originalVerify = tokens.verifyAccessToken;
  const originalGetPool = database.getLomasPool;
  const middlewarePath = require.resolve('../middleware/requireAuth');

  let databaseCalls = 0;
  let currentUser;
  let databaseFails = false;

  tokens.verifyAccessToken = (token) => {
    if (token !== 'token-prueba') {
      throw new Error('Token inválido');
    }

    return { userId: 1, sessionVersion: 1 };
  };

  database.getLomasPool = () => ({
    execute: async (_sql, params) => {
      databaseCalls += 1;
      assert.deepEqual(params, [1]);

      if (databaseFails) throw new Error('Base no disponible');

      return [currentUser ? [currentUser] : []];
    },
  });

  delete require.cache[middlewarePath];

  try {
    const { requireAuth } = require('../middleware/requireAuth');

    async function request(authorization) {
      const req = {
        get: () => authorization,
      };

      const res = {
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(body) {
          this.body = body;
          return this;
        },
      };

      let continued = false;

      await requireAuth(req, res, () => {
        continued = true;
      });

      return { req, res, continued };
    }

    for (const header of [
      undefined,
      'Basic credencial',
      'Bearer token-invalido',
      `Bearer ${'x'.repeat(4097)}`,
    ]) {
      const result = await request(header);
      assert.equal(result.res.statusCode, 401);
      assert.equal(result.continued, false);
    }

    assert.equal(databaseCalls, 0);

    const activeUser = {
      id: 1,
      nombre: 'Persona Prueba',
      email: 'persona@example.com',
      rol: 'usuario',
      estado: 'activo',
      version_sesion: 1,
    };

    for (const user of [
      undefined,
      { ...activeUser, estado: 'inactivo' },
      { ...activeUser, estado: 'pendiente_activacion' },
      { ...activeUser, version_sesion: 2 },
    ]) {
      currentUser = user;

      const result = await request('Bearer token-prueba');
      assert.equal(result.res.statusCode, 401);
      assert.equal(result.continued, false);
    }

    currentUser = activeUser;

    const allowed = await request('Bearer token-prueba');

    assert.equal(allowed.continued, true);
    assert.deepEqual(allowed.req.user, {
      id: 1,
      nombre: 'Persona Prueba',
      email: 'persona@example.com',
      rol: 'usuario',
    });

    databaseFails = true;

    const unavailable = await request('Bearer token-prueba');

    assert.equal(unavailable.res.statusCode, 503);
    assert.equal(unavailable.continued, false);
  } finally {
    tokens.verifyAccessToken = originalVerify;
    database.getLomasPool = originalGetPool;
    delete require.cache[middlewarePath];
  }
});