const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

const database = require('../config/lomasDatabase');
const tokens = require('../services/tokenService');

test('login acepta cuentas activas y rechaza accesos inválidos', async () => {
  const originalGetPool = database.getLomasPool;
  const originalCreateToken = tokens.createAccessToken;
  const controllerPath = require.resolve(
    '../controllers/loginController'
  );

  const password = 'ClaveFicticia123!';
  const hash = await bcrypt.hash(password, 4);

  const activeUser = {
    id: 1,
    nombre: 'Persona Prueba',
    email: 'persona@example.com',
    password_hash: hash,
    rol: 'usuario',
    estado: 'activo',
    version_sesion: 1,
  };

  let currentUser;
  let databaseFails = false;
  let tokenCalls = 0;

  database.getLomasPool = () => ({
    execute: async (_sql, params) => {
      assert.deepEqual(params, ['persona@example.com']);

      if (databaseFails) {
        throw new Error('Fallo simulado');
      }

      return [currentUser ? [currentUser] : []];
    },
  });

  tokens.createAccessToken = (user) => {
    tokenCalls += 1;
    assert.equal(user.id, 1);
    return 'token-ficticio';
  };

  delete require.cache[controllerPath];

  try {
    const { login } = require('../controllers/loginController');

    async function request(inputPassword = password) {
      const req = {
        body: {
          email: 'persona@example.com',
          password: inputPassword,
          rol: 'administrador',
        },
      };

      const res = {
        statusCode: 200,
        headers: {},
        status(code) {
          this.statusCode = code;
          return this;
        },
        set(name, value) {
          this.headers[name] = value;
          return this;
        },
        json(body) {
          this.body = body;
          return this;
        },
      };

      await login(req, res);
      return res;
    }

    for (const user of [
      undefined,
      { ...activeUser, password_hash: null },
      { ...activeUser, estado: 'inactivo' },
      { ...activeUser, estado: 'pendiente_activacion' },
    ]) {
      currentUser = user;
      const response = await request();

      assert.equal(response.statusCode, 401);
      assert.deepEqual(response.body, {
        success: false,
        message: 'Correo o contraseña incorrectos.',
      });
    }

    currentUser = activeUser;

    const incorrect = await request('OtraClaveFicticia!');
    assert.equal(incorrect.statusCode, 401);
    assert.equal(tokenCalls, 0);

    const accepted = await request();

    assert.equal(accepted.statusCode, 200);
    assert.equal(accepted.headers['Cache-Control'], 'no-store');
    assert.deepEqual(accepted.body, {
      success: true,
      token: 'token-ficticio',
      user: {
        id: 1,
        nombre: 'Persona Prueba',
        email: 'persona@example.com',
        rol: 'usuario',
      },
    });
    assert.equal(tokenCalls, 1);

    databaseFails = true;

    const unavailable = await request();

    assert.equal(unavailable.statusCode, 503);
    assert.equal(tokenCalls, 1);
    assert.equal(unavailable.body.token, undefined);
  } finally {
    database.getLomasPool = originalGetPool;
    tokens.createAccessToken = originalCreateToken;
    delete require.cache[controllerPath];
  }
});