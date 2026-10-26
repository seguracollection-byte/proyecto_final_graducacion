const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const database = require('../config/lomasDatabase');

test('recuperación admite cuentas activas y revierte ante fallos', async () => {
  const originalGetPool = database.getLomasPool;
  const servicePath = require.resolve(
    '../services/requestPasswordRecoveryService'
  );

  let scenario;
  let events;
  let calls;

  const connection = {
    async beginTransaction() {
      events.push('begin');
    },

    async execute(sql, params) {
      calls.push({ sql, params });

      if (/SELECT id, email, estado, password_hash/.test(sql)) {
        if (scenario === 'missing') {
          return [[]];
        }

        return [[{
          id: 2,
          email: 'persona@example.com',
          estado: scenario === 'inactive'
            ? 'inactivo'
            : scenario === 'pending'
              ? 'pendiente_activacion'
              : 'activo',
          password_hash: scenario === 'noPassword'
            ? null
            : 'hash-ficticio',
        }]];
      }

      if (/UPDATE tokens_cuenta/.test(sql)) {
        return [{ affectedRows: 1 }];
      }

      if (/INSERT INTO tokens_cuenta/.test(sql)) {
        if (scenario === 'insertFailure') {
          throw new Error('Fallo simulado');
        }

        return [{ insertId: 10 }];
      }

      throw new Error('Consulta inesperada');
    },

    async commit() {
      events.push('commit');
    },

    async rollback() {
      events.push('rollback');
    },

    release() {
      events.push('release');
    },
  };

  database.getLomasPool = () => ({
    async getConnection() {
      events.push('connection');
      return connection;
    },
  });

  delete require.cache[servicePath];

  try {
    const {
      requestPasswordRecovery,
    } = require('../services/requestPasswordRecoveryService');

    scenario = 'success';
    events = [];
    calls = [];

    const result = await requestPasswordRecovery(
      '  PERSONA@EXAMPLE.COM  '
    );

    assert.deepEqual(events, [
      'connection', 'begin', 'commit', 'release',
    ]);
    assert.equal(result.userId, 2);
    assert.equal(result.email, 'persona@example.com');
    assert.match(result.recoveryToken, /^[a-f0-9]{64}$/);
    assert.deepEqual(calls[0].params, ['persona@example.com']);

    const invalidation = calls.find(
      ({ sql }) => /UPDATE tokens_cuenta/.test(sql)
    );

    assert.match(invalidation.sql, /proposito = 'recuperacion'/);
    assert.match(invalidation.sql, /usado_en IS NULL/);
    assert.deepEqual(invalidation.params, [2]);

    const insertion = calls.find(
      ({ sql }) => /INSERT INTO tokens_cuenta/.test(sql)
    );

    const expectedHash = crypto
      .createHash('sha256')
      .update(result.recoveryToken)
      .digest('hex');

    assert.deepEqual(insertion.params, [2, expectedHash]);
    assert.notEqual(insertion.params[1], result.recoveryToken);
    assert.match(insertion.sql, /'recuperacion'/);
    assert.match(insertion.sql, /INTERVAL 15 MINUTE/);

    // Solicitar recuperación no cambia contraseña ni sesiones.
    assert.equal(
      calls.some(({ sql }) => /UPDATE usuarios/.test(sql)),
      false
    );

    for (const name of [
      'missing', 'inactive', 'pending', 'noPassword',
    ]) {
      scenario = name;
      events = [];
      calls = [];

      assert.equal(
        await requestPasswordRecovery('persona@example.com'),
        null
      );

      assert.equal(calls.length, 1);
      assert.deepEqual(events, [
        'connection', 'begin', 'commit', 'release',
      ]);
    }

    scenario = 'insertFailure';
    events = [];
    calls = [];

    await assert.rejects(
      () => requestPasswordRecovery('persona@example.com'),
      /Fallo simulado/
    );

    assert.deepEqual(events, [
      'connection', 'begin', 'rollback', 'release',
    ]);

    for (const email of [undefined, null, '', '   ', 'a'.repeat(255)]) {
      events = [];
      calls = [];

      await assert.rejects(
        () => requestPasswordRecovery(email),
        { code: 'INVALID_EMAIL' }
      );

      assert.deepEqual(events, []);
      assert.deepEqual(calls, []);
    }
  } finally {
    database.getLomasPool = originalGetPool;
    delete require.cache[servicePath];
  }
});