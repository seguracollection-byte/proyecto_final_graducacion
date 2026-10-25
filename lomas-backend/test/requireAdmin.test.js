const { test } = require('node:test');
const assert = require('node:assert/strict');
const { requireAdmin } = require('../middleware/requireAdmin');

test('solo permite continuar a administradores autenticados', () => {
  function check(user) {
    const req = {
      user,
      body: { rol: 'administrador' },
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

    requireAdmin(req, res, () => {
      continued = true;
    });

    return { res, continued };
  }

  const anonymous = check(undefined);
  assert.equal(anonymous.res.statusCode, 401);
  assert.equal(anonymous.continued, false);

  for (const rol of ['usuario', undefined, 'admin']) {
    const denied = check({ id: 1, rol });
    assert.equal(denied.res.statusCode, 403);
    assert.equal(denied.continued, false);
  }

  const allowed = check({ id: 1, rol: 'administrador' });
  assert.equal(allowed.continued, true);
});