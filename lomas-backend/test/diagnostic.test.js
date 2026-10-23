const { test } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../app');
test('diagnóstico sin importar BD o correo y rutas heredadas cerradas', async () => {
  assert.equal(Object.keys(require.cache).some(p => /config\/database|services\/emailService/.test(p)), false);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), {status:'ok', mode:'diagnostic', database:'disabled', email:'disabled'});
    for (const [path, method] of [['auth/update-password','PUT'],['auth/register','POST'],['auth/recuperar','POST'],['citas','POST'],['usuarios/barberos','GET']]) {
      assert.equal((await fetch(`${base}/api/${path}`, {method})).status,503);
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
});
