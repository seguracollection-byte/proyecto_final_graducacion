const { test } = require('node:test');
const assert = require('node:assert/strict');
const database = require('../config/lomasDatabase');

test('lista solicitudes, admite vacío y controla fallos de base', async () => {
  const originalGetPool = database.getLomasPool;
  const controllerPath = require.resolve(
    '../controllers/adminAccessController'
  );

  let rows = [];
  let databaseFails = false;

  database.getLomasPool = () => ({
    execute: async () => {
      if (databaseFails) {
        throw new Error('Fallo simulado');
      }

      return [rows];
    },
  });

  delete require.cache[controllerPath];

  try {
    const {
      listPendingRequests,
    } = require('../controllers/adminAccessController');

    async function request() {
      const res = {
        statusCode: 200,
        headers: {},
        set(name, value) {
          this.headers[name] = value;
          return this;
        },
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(body) {
          this.body = body;
          return this;
        },
      };

      await listPendingRequests({}, res);
      return res;
    }

    const empty = await request();

    assert.equal(empty.statusCode, 200);
    assert.equal(empty.headers['Cache-Control'], 'no-store');
    assert.deepEqual(empty.body, {
      success: true,
      solicitudes: [],
    });

    rows = [
      {
        id: 1,
        nombre: 'Persona Prueba',
        email: 'persona@example.com',
        estado: 'pendiente',
        creado_en: '2026-10-25 12:00:00',
      },
    ];

    const populated = await request();

    assert.equal(populated.statusCode, 200);
    assert.deepEqual(populated.body.solicitudes, rows);

    databaseFails = true;

    const unavailable = await request();

    assert.equal(unavailable.statusCode, 503);
    assert.equal(unavailable.body.success, false);
    assert.equal(unavailable.body.solicitudes, undefined);
  } finally {
    database.getLomasPool = originalGetPool;
    delete require.cache[controllerPath];
  }
});