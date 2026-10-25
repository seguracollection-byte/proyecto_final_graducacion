const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const database = require('../config/lomasDatabase');

test('renueva activación o revierte sin confirmar cambios', async () => {
  const originalGetPool = database.getLomasPool;
  const servicePath = require.resolve(
    '../services/resendActivationService'
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

      switch (calls.length) {
        case 1:
          return [
            scenario === 'inactiveAdmin' ? [] : [{ id: 1 }],
          ];

        case 2:
          return [
            scenario === 'missingRequest'
              ? []
              : [{ usuario_id: 2 }],
          ];

        case 3:
          return [[{
            id: 2,
            email: 'persona@example.com',
            estado: scenario === 'activeUser'
              ? 'activo'
              : 'pendiente_activacion',
          }]];

        case 4:
          return [{ affectedRows: 1 }];

        case 5:
          if (scenario === 'insertFailure') {
            throw new Error('Fallo simulado');
          }

          return [{ insertId: 8 }];

        default:
          throw new Error('Consulta inesperada');
      }
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
      return connection;
    },
  });

  delete require.cache[servicePath];

  try {
    const {
      renewActivationToken,
    } = require('../services/resendActivationService');

    scenario = 'success';
    events = [];
    calls = [];

    const result = await renewActivationToken(4, 1);

    assert.deepEqual(events, ['begin', 'commit', 'release']);
    assert.equal(result.userId, 2);
    assert.match(result.activationToken, /^[a-f0-9]{64}$/);

    assert.deepEqual(calls[0].params, [1]);
    assert.deepEqual(calls[1].params, [4]);
    assert.deepEqual(calls[2].params, [2]);

    assert.match(calls[3].sql, /usado_en = UTC_TIMESTAMP/);
    assert.deepEqual(calls[3].params, [2]);

    const expectedHash = crypto
      .createHash('sha256')
      .update(result.activationToken)
      .digest('hex');

    assert.deepEqual(calls[4].params, [2, expectedHash]);
    assert.match(calls[4].sql, /INTERVAL 24 HOUR/);

    for (const [name, code] of [
      ['inactiveAdmin', 'ADMIN_NOT_ACTIVE'],
      ['missingRequest', 'ACTIVATION_CONFLICT'],
      ['activeUser', 'ACTIVATION_CONFLICT'],
      ['insertFailure', undefined],
    ]) {
      scenario = name;
      events = [];
      calls = [];

      await assert.rejects(
        () => renewActivationToken(4, 1),
        (error) => code
          ? error.code === code
          : error.message === 'Fallo simulado'
      );

      assert.deepEqual(
        events,
        ['begin', 'rollback', 'release']
      );
    }
  } finally {
    database.getLomasPool = originalGetPool;
    delete require.cache[servicePath];
  }
});