const { test } = require('node:test');
const assert = require('node:assert/strict');
const database = require('../config/lomasDatabase');

test('aprobación confirma cambios o revierte ante conflictos', async () => {
  const originalGetPool = database.getLomasPool;
  const servicePath = require.resolve(
    '../services/approveAccessService'
  );

  let scenario;
  let events;
  let executions;

  const connection = {
    async beginTransaction() {
      events.push('begin');
    },

    async execute(sql, params) {
      executions.push({ sql, params });

      switch (executions.length) {
        case 1:
          return [
            scenario === 'inactiveAdmin' ? [] : [{ id: 1 }],
          ];

        case 2:
          if (scenario === 'missing') return [[]];

          return [[{
            id: 4,
            nombre: 'Persona Prueba',
            email: 'persona@example.com',
            estado: scenario === 'reviewed'
              ? 'rechazada'
              : 'pendiente',
          }]];

        case 3:
          return [
            scenario === 'existingUser' ? [{ id: 9 }] : [],
          ];

        case 4:
          if (scenario === 'duplicate') {
            const error = new Error('Duplicado simulado');
            error.code = 'ER_DUP_ENTRY';
            throw error;
          }

          return [{ insertId: 2 }];

        case 5:
          if (scenario === 'tokenFailure') {
            throw new Error('Fallo simulado');
          }

          return [{ affectedRows: 1 }];

        case 6:
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

  database.getLomasPool = () => ({
    async getConnection() {
      return connection;
    },
  });

  delete require.cache[servicePath];

  try {
    const {
      approveAccessRequest,
    } = require('../services/approveAccessService');

    scenario = 'success';
    events = [];
    executions = [];

    const result = await approveAccessRequest(4, 1);

    assert.deepEqual(events, ['begin', 'commit', 'release']);
    assert.equal(result.userId, 2);
    assert.equal(result.email, 'persona@example.com');
    assert.match(result.activationToken, /^[a-f0-9]{64}$/);

    assert.deepEqual(executions[0].params, [1]);
    assert.deepEqual(executions[1].params, [4]);

    assert.match(executions[3].sql, /'usuario'/);
    assert.match(executions[3].sql, /'pendiente_activacion'/);

    const crypto = require('node:crypto');
    const expectedHash = crypto
      .createHash('sha256')
      .update(result.activationToken)
      .digest('hex');

    assert.deepEqual(executions[4].params, [2, expectedHash]);
    assert.match(executions[4].sql, /INTERVAL 24 HOUR/);
    assert.deepEqual(executions[5].params, [1, 2, 4]);

    for (const [name, code] of [
      ['inactiveAdmin', 'ADMIN_NOT_ACTIVE'],
      ['missing', 'APPROVAL_CONFLICT'],
      ['reviewed', 'APPROVAL_CONFLICT'],
      ['existingUser', 'APPROVAL_CONFLICT'],
      ['duplicate', 'APPROVAL_CONFLICT'],
      ['tokenFailure', undefined],
    ]) {
      scenario = name;
      events = [];
      executions = [];

      await assert.rejects(
        () => approveAccessRequest(4, 1),
        (error) => (
          code ? error.code === code : error.message === 'Fallo simulado'
        )
      );

      assert.deepEqual(
        events,
        ['begin', 'rollback', 'release'],
        name
      );
    }
  } finally {
    database.getLomasPool = originalGetPool;
    delete require.cache[servicePath];
  }
});