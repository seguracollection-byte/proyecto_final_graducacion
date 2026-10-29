const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const database = require('../config/lomasDatabase');

test(
  'MFA crea desafíos y revierte ante cambios de cuenta o fallos',
  async () => {
    const originalGetPool = database.getLomasPool;
    const servicePath = require.resolve(
      '../services/mfaChallengeService'
    );

    const verifiedUser = {
      id: 1,
      version_sesion: 2,
      password_hash: 'hash-ficticio-de-prueba',
    };

    let scenario;
    let events;
    let executions;

    const connection = {
      async beginTransaction() {
        events.push('begin');
      },

      async execute(sql, params) {
        executions.push({ sql, params });

        if (sql.includes('FROM usuarios')) {
          if (scenario === 'missingUser') {
            return [[]];
          }

          return [[{
            id: 1,
            estado: scenario === 'inactiveUser'
              ? 'inactivo'
              : 'activo',
            version_sesion: scenario === 'changedVersion'
              ? 3
              : 2,
            password_hash: scenario === 'changedPassword'
              ? 'otro-hash'
              : verifiedUser.password_hash,
          }]];
        }

        if (sql.includes('FROM mfa_totp')) {
          return [
            scenario === 'configured'
              ? [{ confirmado_en: '2026-01-01 12:00:00' }]
              : [],
          ];
        }

        if (sql.includes('UPDATE mfa_desafios')) {
          return [{ affectedRows: 1 }];
        }

        if (sql.includes('INSERT INTO mfa_desafios')) {
          if (scenario === 'insertFailure') {
            throw new Error('Fallo simulado de inserción');
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
        return connection;
      },
    });

    delete require.cache[servicePath];

    try {
      const {
        createMfaChallenge,
      } = require('../services/mfaChallengeService');

      for (const [name, expectedPurpose] of [
        ['notConfigured', 'configuracion'],
        ['configured', 'verificacion'],
      ]) {
        scenario = name;
        events = [];
        executions = [];

        const result = await createMfaChallenge(verifiedUser);

        assert.equal(result.purpose, expectedPurpose);
        assert.equal(result.expiresIn, 300);
        assert.match(result.challenge, /^[a-f0-9]{64}$/);

        assert.deepEqual(
          events,
          ['begin', 'commit', 'release']
        );

        const insert = executions.find(
          (execution) => execution.sql.includes(
            'INSERT INTO mfa_desafios'
          )
        );

        const expectedHash = crypto
          .createHash('sha256')
          .update(result.challenge, 'utf8')
          .digest('hex');

        assert.deepEqual(insert.params, [
          verifiedUser.id,
          expectedHash,
          expectedPurpose,
          verifiedUser.version_sesion,
        ]);

        assert.notEqual(insert.params[1], result.challenge);
        assert.match(insert.sql, /INTERVAL 5 MINUTE/);

        const invalidation = executions.find(
          (execution) => execution.sql.includes(
            'UPDATE mfa_desafios'
          )
        );

        assert.deepEqual(invalidation.params, [verifiedUser.id]);
      }

      for (const name of [
        'missingUser',
        'inactiveUser',
        'changedVersion',
        'changedPassword',
        'insertFailure',
      ]) {
        scenario = name;
        events = [];
        executions = [];

        await assert.rejects(
          () => createMfaChallenge(verifiedUser)
        );

        assert.deepEqual(
          events,
          ['begin', 'rollback', 'release'],
          name
        );

        if (name !== 'insertFailure') {
          assert.equal(
            executions.some(
              (execution) => execution.sql.includes(
                'INSERT INTO mfa_desafios'
              )
            ),
            false
          );
        }
      }

      events = [];
      executions = [];

      await assert.rejects(
        () => createMfaChallenge({
          ...verifiedUser,
          id: 0,
        })
      );

      assert.deepEqual(events, []);
      assert.deepEqual(executions, []);
    } finally {
      database.getLomasPool = originalGetPool;
      delete require.cache[servicePath];
    }
  }
);