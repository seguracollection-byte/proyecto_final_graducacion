const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const database = require('../config/lomasDatabase');
const { hashAccountToken } = require('../services/accountTokenService');

test('restablece contraseña, invalida sesiones y rechaza enlaces inválidos', async () => {
  const originalGetPool = database.getLomasPool;
  const servicePath = require.resolve(
    '../services/resetPasswordService'
  );

  const token = 'a'.repeat(64);
  const password = 'ClaveDePrueba123!';
  const tokenHash = hashAccountToken(token);

  let scenario;
  let events;
  let calls;

  function prepare(name) {
    scenario = name;
    events = [];
    calls = [];
  }

  const connection = {
    async beginTransaction() {
      events.push('begin');
    },

    async execute(sql, params) {
      calls.push({ sql, params });

      if (/SELECT usuario_id/.test(sql)) {
        assert.deepEqual(params, [tokenHash]);
        assert.match(sql, /proposito = 'recuperacion'/);
        assert.match(sql, /usado_en IS NULL/);
        assert.match(sql, /vence_en > UTC_TIMESTAMP/);

        return scenario === 'missingToken'
          ? [[]]
          : [[{ usuario_id: 2 }]];
      }

      if (/SELECT id, estado, password_hash/.test(sql)) {
        assert.deepEqual(params, [2]);
        assert.match(sql, /FOR UPDATE/);

        if (scenario === 'missingUser') {
          return [[]];
        }

        return [[{
          id: 2,
          estado: scenario === 'inactiveUser'
            ? 'inactivo'
            : 'activo',
          password_hash: scenario === 'noPassword'
            ? null
            : 'hash-anterior-ficticio',
        }]];
      }

      if (/SELECT id\s+FROM tokens_cuenta/.test(sql)) {
        assert.deepEqual(params, [tokenHash, 2]);
        assert.match(sql, /proposito = 'recuperacion'/);
        assert.match(sql, /usado_en IS NULL/);
        assert.match(sql, /vence_en > UTC_TIMESTAMP/);
        assert.match(sql, /FOR UPDATE/);

        // Simula que el enlace dejó de estar disponible
        // entre la consulta inicial y el bloqueo.
        return scenario === 'unavailableToken'
          ? [[]]
          : [[{ id: 10 }]];
      }

      if (/UPDATE usuarios/.test(sql)) {
        assert.match(
          sql,
          /version_sesion = version_sesion \+ 1/
        );
        assert.equal(params[1], 2);

        events.push('passwordUpdate');
        return [{ affectedRows: 1 }];
      }

      if (/UPDATE tokens_cuenta/.test(sql)) {
        assert.match(sql, /proposito = 'recuperacion'/);
        assert.match(sql, /usado_en = UTC_TIMESTAMP/);
        assert.deepEqual(params, [2]);

        if (scenario === 'invalidateFailure') {
          throw new Error('Fallo simulado');
        }

        events.push('tokensConsumed');
        return [{ affectedRows: 1 }];
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
      resetPassword,
    } = require('../services/resetPasswordService');

    prepare('success');

    const result = await resetPassword(token, password);

    assert.deepEqual(result, { success: true });
    assert.deepEqual(events, [
      'connection',
      'begin',
      'passwordUpdate',
      'tokensConsumed',
      'commit',
      'release',
    ]);

    const update = calls.find(
      ({ sql }) => /UPDATE usuarios/.test(sql)
    );

    assert.notEqual(update.params[0], password);
    assert.equal(
      await bcrypt.compare(password, update.params[0]),
      true
    );

    prepare('missingToken');

    await assert.rejects(
      () => resetPassword(token, password),
      { code: 'INVALID_ACCOUNT_TOKEN' }
    );

    assert.deepEqual(events, ['connection', 'release']);

    for (const name of [
      'missingUser',
      'inactiveUser',
      'noPassword',
      'unavailableToken',
    ]) {
      prepare(name);

      await assert.rejects(
        () => resetPassword(token, password),
        { code: 'INVALID_ACCOUNT_TOKEN' }
      );

      assert.deepEqual(events, [
        'connection', 'begin', 'rollback', 'release',
      ]);

      assert.equal(
        calls.some(({ sql }) => /UPDATE usuarios/.test(sql)),
        false
      );
    }

    prepare('invalidateFailure');

    await assert.rejects(
      () => resetPassword(token, password),
      /Fallo simulado/
    );

    assert.deepEqual(events, [
      'connection',
      'begin',
      'passwordUpdate',
      'rollback',
      'release',
    ]);

    prepare('invalidFormat');

    await assert.rejects(
      () => resetPassword('token-invalido', password),
      { code: 'INVALID_ACCOUNT_TOKEN' }
    );

    assert.deepEqual(events, []);

    for (const invalidPassword of [
      undefined,
      '',
      'corta',
      'a'.repeat(73),
      '🔒'.repeat(19),
    ]) {
      prepare('invalidPassword');

      await assert.rejects(
        () => resetPassword(token, invalidPassword),
        { code: 'INVALID_PASSWORD' }
      );

      assert.deepEqual(events, []);
    }
  } finally {
    database.getLomasPool = originalGetPool;
    delete require.cache[servicePath];
  }
});