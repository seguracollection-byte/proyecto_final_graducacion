const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const database = require('../config/lomasDatabase');

test(
  'desafío biométrico de ingreso exige permiso y dispositivo vigentes',
  async () => {
    const originalGetPool = database.getLomasPool;

    const servicePath = require.resolve(
      '../services/biometricLoginChallengeService'
    );

    const input = {
      challenge: 'd'.repeat(64),
      deviceId: '11111111-1111-4111-8111-111111111111',
    };

    const expectedLoginHash = crypto
      .createHash('sha256')
      .update(input.challenge, 'utf8')
      .digest('hex');

    const expiration = new Date('2030-01-01T12:00:00Z');

    let scenario;
    let events;
    let executions;
    let lookups;

    const connection = {
      async beginTransaction() {
        events.push('begin');
      },

      async execute(sql, params) {
        executions.push({ sql, params });

        if (sql.includes('FROM usuarios')) {
          return [
            scenario === 'missingUser'
              ? []
              : [{
                id: 1,
                estado: scenario === 'inactiveUser'
                  ? 'inactivo'
                  : 'activo',
                version_sesion: 2,
              }],
          ];
        }

        if (sql.includes('FROM mfa_desafios')) {
          return [
            scenario === 'invalidLoginChallenge'
              ? []
              : [{
                id: 10,
                vence_en: expiration,
              }],
          ];
        }

        if (sql.includes('FROM mfa_dispositivos')) {
          return [
            scenario === 'invalidDevice'
              ? []
              : [{ id: input.deviceId }],
          ];
        }

        if (
          sql.includes('INSERT INTO mfa_desafios_biometricos') &&
          scenario === 'insertFailure'
        ) {
          throw new Error('Fallo simulado de inserción');
        }

        if (
          sql.includes('UPDATE mfa_desafios_biometricos') ||
          sql.includes('INSERT INTO mfa_desafios_biometricos')
        ) {
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
      async execute(sql, params) {
        lookups.push({ sql, params });

        return [
          scenario === 'missingChallenge'
            ? []
            : [{ usuario_id: 1 }],
        ];
      },

      async getConnection() {
        return connection;
      },
    });

    delete require.cache[servicePath];

    function reset(name) {
      scenario = name;
      events = [];
      executions = [];
      lookups = [];
    }

    try {
      const {
        createBiometricLoginChallenge,
      } = require('../services/biometricLoginChallengeService');

      reset('success');

      const result = await createBiometricLoginChallenge(input);

      assert.deepEqual(
        events,
        ['begin', 'commit', 'release']
      );

      assert.deepEqual(
        lookups[0].params,
        [expectedLoginHash]
      );

      assert.match(result.challenge, /^[a-f0-9]{64}$/);
      assert.notEqual(result.challenge, input.challenge);

      assert.equal(
        result.message,
        [
          'lomas-eveneser',
          'biometria',
          'ingreso',
          1,
          input.deviceId,
          10,
          2,
          result.challenge,
        ].join(':')
      );

      const permission = executions.find(
        (entry) => entry.sql.includes('FROM mfa_desafios')
      );

      assert.deepEqual(
        permission.params,
        [expectedLoginHash, 1, 2]
      );

      assert.match(permission.sql, /proposito = 'verificacion'/);
      assert.match(permission.sql, /usado_en IS NULL/);
      assert.match(permission.sql, /intentos_fallidos < 5/);
      assert.match(
        permission.sql,
        /vence_en > UTC_TIMESTAMP\(\)/
      );

      const device = executions.find(
        (entry) => entry.sql.includes('FROM mfa_dispositivos')
      );

      assert.deepEqual(device.params, [input.deviceId, 1]);
      assert.match(device.sql, /estado = 'activo'/);

      const invalidation = executions.find(
        (entry) => entry.sql.includes(
          'UPDATE mfa_desafios_biometricos'
        )
      );

      assert.deepEqual(invalidation.params, [10]);

      const insertion = executions.find(
        (entry) => entry.sql.includes(
          'INSERT INTO mfa_desafios_biometricos'
        )
      );

      const expectedBiometricHash = crypto
        .createHash('sha256')
        .update(result.challenge, 'utf8')
        .digest('hex');

      assert.deepEqual(insertion.params, [
        1,
        input.deviceId,
        10,
        expectedBiometricHash,
        result.message,
        2,
        expiration,
      ]);

      assert.match(insertion.sql, /LEAST\(/);
      assert.match(insertion.sql, /INTERVAL 2 MINUTE/);

      for (const name of [
        'missingUser',
        'inactiveUser',
        'invalidLoginChallenge',
        'invalidDevice',
        'insertFailure',
      ]) {
        reset(name);

        await assert.rejects(
          () => createBiometricLoginChallenge(input),
          name === 'insertFailure'
            ? /Fallo simulado de inserción/
            : { code: 'BIOMETRIC_CHALLENGE_INVALID' }
        );

        assert.deepEqual(
          events,
          ['begin', 'rollback', 'release'],
          name
        );
      }

      reset('missingChallenge');

      await assert.rejects(
        () => createBiometricLoginChallenge(input),
        { code: 'BIOMETRIC_CHALLENGE_INVALID' }
      );

      assert.deepEqual(events, []);

      for (const changes of [
        { challenge: 'invalido' },
        { deviceId: 'invalido' },
      ]) {
        reset('invalidInput');

        await assert.rejects(
          () => createBiometricLoginChallenge({
            ...input,
            ...changes,
          }),
          { code: 'BIOMETRIC_CHALLENGE_INVALID' }
        );

        assert.deepEqual(lookups, []);
        assert.deepEqual(events, []);
      }
    } finally {
      database.getLomasPool = originalGetPool;
      delete require.cache[servicePath];
    }
  }
);