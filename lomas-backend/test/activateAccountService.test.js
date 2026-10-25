const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const database = require('../config/lomasDatabase');
const {
  hashAccountToken,
} = require('../services/accountTokenService');

test('activa cuentas y revierte ante tokens inválidos o fallos', async () => {
  const originalGetPool = database.getLomasPool;
  const originalHash = bcrypt.hash;
  const servicePath = require.resolve(
    '../services/activateAccountService'
  );

  const token = 'a'.repeat(64);
  const password = 'ClaveFicticia123!';
  const tokenHash = hashAccountToken(token);

  let scenario;
  let events;
  let executions;
  let poolCalls = 0;

  bcrypt.hash = async (value, cost) => {
    assert.equal(value, password);
    assert.equal(cost, 12);
    return 'hash-ficticio';
  };

  const connection = {
    async beginTransaction() {
      events.push('begin');
    },

    async execute(sql, params) {
      executions.push({ sql, params });

      switch (executions.length) {
        case 1:
          return [
            scenario === 'unknownToken'
              ? []
              : [{ usuario_id: 2 }],
          ];

        case 2:
          if (scenario === 'missingUser') return [[]];

          return [[{
            id: 2,
            estado: scenario === 'activeUser'
              ? 'activo'
              : 'pendiente_activacion',
          }]];

        case 3:
          return [
            scenario === 'unavailableToken'
              ? []
              : [{ id: 5 }],
          ];

        case 4:
          return [{ affectedRows: 1 }];

        case 5:
          if (scenario === 'writeFailure') {
            throw new Error('Fallo simulado');
          }

          return [{ affectedRows: 1 }];

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

  database.getLomasPool = () => {
    poolCalls += 1;

    return {
      async getConnection() {
        return connection;
      },
    };
  };

  delete require.cache[servicePath];

  try {
    const {
      activateAccount,
    } = require('../services/activateAccountService');

    await assert.rejects(
      () => activateAccount('invalido', password),
      { code: 'INVALID_ACCOUNT_TOKEN' }
    );

    for (const invalid of [
      undefined,
      '',
      'corta',
      'a'.repeat(73),
    ]) {
      await assert.rejects(
        () => activateAccount(token, invalid),
        { code: 'INVALID_PASSWORD' }
      );
    }

    assert.equal(poolCalls, 0);

    scenario = 'success';
    events = [];
    executions = [];

    const result = await activateAccount(token, password);

    assert.deepEqual(result, { success: true });
    assert.deepEqual(events, ['begin', 'commit', 'release']);

    assert.deepEqual(executions[0].params, [tokenHash]);
    assert.deepEqual(executions[1].params, [2]);
    assert.deepEqual(executions[2].params, [tokenHash, 2]);

    assert.match(executions[2].sql, /usado_en IS NULL/);
    assert.match(
      executions[2].sql,
      /vence_en > UTC_TIMESTAMP\(\)/
    );
    assert.match(executions[2].sql, /FOR UPDATE/);

    assert.deepEqual(
      executions[3].params,
      ['hash-ficticio', 2]
    );
    assert.match(
      executions[3].sql,
      /version_sesion = version_sesion \+ 1/
    );
    assert.deepEqual(executions[4].params, [2]);

    for (const name of [
      'unknownToken',
      'missingUser',
      'activeUser',
      'unavailableToken',
      'writeFailure',
    ]) {
      scenario = name;
      events = [];
      executions = [];

      await assert.rejects(
        () => activateAccount(token, password),
        (error) => (
          name === 'writeFailure'
            ? error.message === 'Fallo simulado'
            : error.code === 'INVALID_ACCOUNT_TOKEN'
        )
      );

      assert.equal(events.includes('commit'), false);
      assert.equal(events.includes('rollback'), true);
      assert.equal(events.at(-1), 'release');

      if (name !== 'writeFailure') {
        assert.equal(executions.length <= 3, true);
      }
    }
  } finally {
    database.getLomasPool = originalGetPool;
    bcrypt.hash = originalHash;
    delete require.cache[servicePath];
  }
});