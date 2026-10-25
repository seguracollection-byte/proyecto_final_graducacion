const { test } = require('node:test');
const assert = require('node:assert/strict');
const database = require('../config/lomasDatabase');

test('rechaza pendientes y controla conflictos y fallos', async () => {
  const originalGetPool = database.getLomasPool;
  const controllerPath = require.resolve(
    '../controllers/adminAccessController'
  );

  let affectedRows = 1;
  let databaseFails = false;
  let receivedParams;

  database.getLomasPool = () => ({
    execute: async (_sql, params) => {
      receivedParams = params;

      if (databaseFails) {
        throw new Error('Fallo simulado');
      }

      return [{ affectedRows }];
    },
  });

  delete require.cache[controllerPath];

  try {
    const {
      rejectAccessRequest,
    } = require('../controllers/adminAccessController');

    async function request() {
      const req = {
        user: { id: 7, rol: 'administrador' },
        params: { id: 3 },
        body: { revisada_por: 999 },
      };

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

      await rejectAccessRequest(req, res);
      return res;
    }

    const rejected = await request();

    assert.equal(rejected.statusCode, 200);
    assert.equal(rejected.body.success, true);
    assert.equal(rejected.headers['Cache-Control'], 'no-store');
    assert.deepEqual(receivedParams, [7, 3]);

    affectedRows = 0;

    const conflict = await request();

    assert.equal(conflict.statusCode, 409);
    assert.equal(conflict.body.success, false);

    databaseFails = true;

    const unavailable = await request();

    assert.equal(unavailable.statusCode, 503);
    assert.equal(unavailable.body.success, false);
  } finally {
    database.getLomasPool = originalGetPool;
    delete require.cache[controllerPath];
  }
});