const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  createAccountToken,
  hashAccountToken,
} = require('../services/accountTokenService');

test('genera tokens aleatorios y calcula su hash', () => {
  const first = createAccountToken();
  const second = createAccountToken();

  assert.match(first.token, /^[a-f0-9]{64}$/);
  assert.match(first.tokenHash, /^[a-f0-9]{64}$/);

  assert.equal(
    hashAccountToken(first.token),
    first.tokenHash
  );

  assert.notEqual(first.token, second.token);
  assert.notEqual(first.tokenHash, second.tokenHash);

  // Valor ficticio conocido para comprobar SHA-256.
  const crypto = require('node:crypto');
  const fixture = 'a'.repeat(64);

  assert.equal(
    hashAccountToken(fixture),
    crypto.createHash('sha256').update(fixture).digest('hex')
  );

  for (const invalid of [
    undefined,
    null,
    123,
    '',
    'abc',
    'g'.repeat(64),
    'a'.repeat(63),
    'a'.repeat(65),
  ]) {
    assert.throws(() => hashAccountToken(invalid));
  }
});