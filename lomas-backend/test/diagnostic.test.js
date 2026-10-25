const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const database = require('../config/lomasDatabase');

test('estado, rutas heredadas y validación sin acceso a BD', async () => {
  let poolCalls = 0;
  const originalGetPool = database.getLomasPool;

  database.getLomasPool = () => {
    poolCalls += 1;
    throw new Error('Esta prueba no debe acceder a la BD');
  };

  let server;

  try {
    // Cargar después de sustituir getLomasPool para que
    // el controlador reciba la función de prueba.
    const app = require('../app');

    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');

    const base = `http://127.0.0.1:${server.address().port}`;

    const health = await fetch(`${base}/health`);

    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), {
      status: 'ok',
      mode: 'development',
      database: 'on-demand',
      email: 'disabled',
    });

    const legacyRoutes = [
      ['auth/update-password', 'PUT'],
      ['auth/register', 'POST'],
      ['auth/recuperar', 'POST'],
      ['citas', 'POST'],
      ['usuarios/barberos', 'GET'],
    ];

    for (const [path, method] of legacyRoutes) {
      const response = await fetch(`${base}/api/${path}`, {
        method,
      });

      assert.equal(response.status, 503);
      await response.text();
    }

    const invalid = await fetch(
      `${base}/api/solicitudes-acceso`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: 'A',
          email: 'correo-invalido',
        }),
      }
    );

    assert.equal(invalid.status, 400);

    const result = await invalid.json();

    assert.equal(result.success, false);
    assert.deepEqual(
      result.errors.map((error) => error.campo).sort(),
      ['email', 'nombre']
    );

    assert.equal(poolCalls, 0);
  } finally {
    database.getLomasPool = originalGetPool;

    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  }
});