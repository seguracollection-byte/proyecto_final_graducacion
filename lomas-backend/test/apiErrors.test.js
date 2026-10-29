const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const app = require('../app');
test('API rechaza JSON inválido y cuerpos grandes sin filtrar trazas', async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/login`;
    for (const [body, expected] of [['{', 400], [JSON.stringify({ value: 'a'.repeat(103000) }), 413]]) {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      assert.equal(response.status, expected);
      assert.equal(response.headers.get('x-powered-by'), null);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const data = await response.json();
      assert.equal(data.success, false);
      assert.deepEqual(Object.keys(data).sort(), ['message', 'success']);
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
});
