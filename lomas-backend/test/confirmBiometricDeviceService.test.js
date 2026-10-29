const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const database = require('../config/lomasDatabase');
const biometricCrypto = require('../services/biometricCryptoService');

test(
  'confirmación biométrica activa el dispositivo solo con una firma válida',
  async () => {
    const originalGetPool = database.getLomasPool;
    const originalVerify =
      biometricCrypto.verifyBiometricSignature;

    const servicePath = require.resolve(
      '../services/confirmBiometricDeviceService'
    );

    const input = {
      userId: 1,
      sessionVersion: 2,
      challenge: 'c'.repeat(64),
      signature: 'firma-ficticia',
    };

    const expectedHash = crypto
      .createHash('sha256')
      .update(input.challenge, 'utf8')
      .digest('hex');

    let scenario;
    let events;
    let executions;
    let verificationCalls;

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
            version_sesion: scenario === 'changedSession'
              ? 3
              : 2,
          }]];
        }

        if (sql.includes('FROM mfa_desafios_biometricos')) {
          return [
            scenario === 'invalidChallenge'
              ? []
              : [{
                id: 10,
                dispositivo_id: 'dispositivo-ficticio',
                mensaje: 'mensaje-guardado-por-el-servidor',
              }],
          ];
        }

        if (sql.includes('FROM mfa_dispositivos')) {
          return [
            scenario === 'invalidDevice'
              ? []
              : [{
                id: 'dispositivo-ficticio',
                nombre: 'Teléfono de prueba',
                clave_publica: 'clave-publica-ficticia',
              }],
          ];
        }

        if (
          scenario === 'writeFailure' &&
          sql.includes('UPDATE mfa_dispositivos')
        ) {
          throw new Error('Fallo simulado de activación');
        }

        if (
          sql.includes('UPDATE mfa_dispositivos') ||
          sql.includes('UPDATE mfa_desafios_biometricos')
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
      async getConnection() {
        return connection;
      },
    });

    biometricCrypto.verifyBiometricSignature = (options) => {
      verificationCalls += 1;

      assert.deepEqual(options, {
        publicKey: 'clave-publica-ficticia',
        message: 'mensaje-guardado-por-el-servidor',
        signature: input.signature,
      });

      return scenario !== 'invalidSignature';
    };

    delete require.cache[servicePath];

    function reset(name) {
      scenario = name;
      events = [];
      executions = [];
      verificationCalls = 0;
    }

    try {
      const {
        confirmBiometricDevice,
      } = require('../services/confirmBiometricDeviceService');

      reset('success');

      const result = await confirmBiometricDevice(input);

      assert.deepEqual(result, {
        deviceId: 'dispositivo-ficticio',
        name: 'Teléfono de prueba',
      });

      assert.equal(verificationCalls, 1);

      assert.deepEqual(
        events,
        ['begin', 'commit', 'release']
      );

      const challengeLookup = executions.find(
        (entry) => entry.sql.includes(
          'FROM mfa_desafios_biometricos'
        )
      );

      assert.deepEqual(
        challengeLookup.params,
        [expectedHash, 1, 2]
      );

      assert.match(
        challengeLookup.sql,
        /proposito = 'registro'/
      );
      assert.match(challengeLookup.sql, /usado_en IS NULL/);
      assert.match(
        challengeLookup.sql,
        /vence_en > UTC_TIMESTAMP\(\)/
      );
      assert.match(
        challengeLookup.sql,
        /intentos_fallidos < 5/
      );

      const deviceLookup = executions.find(
        (entry) => entry.sql.includes('FROM mfa_dispositivos')
      );

      assert.deepEqual(
        deviceLookup.params,
        ['dispositivo-ficticio', 1]
      );
      assert.match(deviceLookup.sql, /estado = 'pendiente'/);

      const activation = executions.find(
        (entry) => entry.sql.includes('UPDATE mfa_dispositivos')
      );

      assert.deepEqual(
        activation.params,
        ['dispositivo-ficticio', 1]
      );
      assert.match(activation.sql, /estado = 'activo'/);

      const consumption = executions.find(
        (entry) => (
          entry.sql.includes('UPDATE mfa_desafios_biometricos') &&
          entry.sql.includes('SET usado_en')
        )
      );

      assert.deepEqual(consumption.params, [10]);

      reset('invalidSignature');

      await assert.rejects(
        () => confirmBiometricDevice(input),
        { code: 'BIOMETRIC_SIGNATURE_INVALID' }
      );

      // El intento incorrecto se guarda.
      assert.deepEqual(
        events,
        ['begin', 'commit', 'release']
      );

      const failedAttempt = executions.find(
        (entry) => entry.sql.includes(
          'intentos_fallidos = intentos_fallidos + 1'
        )
      );

      assert.deepEqual(failedAttempt.params, [10]);

      assert.equal(
        executions.some(
          (entry) => entry.sql.includes('UPDATE mfa_dispositivos')
        ),
        false
      );

      for (const [name, expectedCode] of [
        ['missingUser', 'BIOMETRIC_SESSION_INVALID'],
        ['inactiveUser', 'BIOMETRIC_SESSION_INVALID'],
        ['changedSession', 'BIOMETRIC_SESSION_INVALID'],
        ['invalidChallenge', 'BIOMETRIC_CHALLENGE_INVALID'],
        ['invalidDevice', 'BIOMETRIC_CHALLENGE_INVALID'],
        ['writeFailure', null],
      ]) {
        reset(name);

        await assert.rejects(
          () => confirmBiometricDevice(input),
          expectedCode
            ? { code: expectedCode }
            : /Fallo simulado de activación/
        );

        assert.deepEqual(
          events,
          ['begin', 'rollback', 'release'],
          name
        );
      }

      for (const [changes, expectedCode] of [
        [{ userId: 0 }, 'BIOMETRIC_SESSION_INVALID'],
        [{ sessionVersion: 0 }, 'BIOMETRIC_SESSION_INVALID'],
        [{ challenge: 'invalido' }, 'BIOMETRIC_CHALLENGE_INVALID'],
        [{ signature: '' }, 'BIOMETRIC_SIGNATURE_INVALID'],
        [{ signature: 'a'.repeat(513) }, 'BIOMETRIC_SIGNATURE_INVALID'],
      ]) {
        reset('invalidInput');

        await assert.rejects(
          () => confirmBiometricDevice({
            ...input,
            ...changes,
          }),
          { code: expectedCode }
        );

        assert.deepEqual(events, []);
        assert.deepEqual(executions, []);
        assert.equal(verificationCalls, 0);
      }
    } finally {
      database.getLomasPool = originalGetPool;
      biometricCrypto.verifyBiometricSignature = originalVerify;
      delete require.cache[servicePath];
    }
  }
);