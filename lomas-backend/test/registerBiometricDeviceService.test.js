const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const database = require('../config/lomasDatabase');
const biometricCrypto = require('../services/biometricCryptoService');

test(
  'registro biométrico exige MFA y prepara un dispositivo pendiente',
  async () => {
    const originalGetPool = database.getLomasPool;
    const originalNormalize =
      biometricCrypto.normalizeBiometricPublicKey;

    const servicePath = require.resolve(
      '../services/registerBiometricDeviceService'
    );

    let scenario;
    let events;
    let executions;

    const input = {
      userId: 1,
      sessionVersion: 2,
      publicKey: 'clave-publica-ficticia',
      name: '  Teléfono de prueba  ',
      platform: 'android',
    };

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

        if (sql.includes('FROM mfa_totp')) {
          return [
            scenario === 'missingMfa'
              ? []
              : [{
                confirmado_en:
                  scenario === 'unconfirmedMfa'
                    ? null
                    : '2026-01-01 12:00:00',
              }],
          ];
        }

        if (
          sql.includes('FROM mfa_dispositivos') &&
          sql.includes('SELECT id')
        ) {
          return [
            scenario === 'deviceLimit'
              ? Array.from(
                { length: 10 },
                (_, index) => ({ id: String(index) })
              )
              : [],
          ];
        }

        if (sql.includes('INSERT INTO mfa_dispositivos')) {
          if (scenario === 'duplicateKey') {
            const error = new Error('Duplicado simulado');
            error.code = 'ER_DUP_ENTRY';
            throw error;
          }

          return [{ affectedRows: 1 }];
        }

        if (
          sql.includes('INSERT INTO mfa_desafios_biometricos') &&
          scenario === 'challengeFailure'
        ) {
          throw new Error('Fallo simulado de desafío');
        }

        if (
          sql.includes('UPDATE mfa_desafios_biometricos') ||
          sql.includes('UPDATE mfa_dispositivos') ||
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
      async getConnection() {
        return connection;
      },
    });

    biometricCrypto.normalizeBiometricPublicKey = (value) => {
      if (value === 'invalida') {
        throw new Error('Clave inválida simulada');
      }

      assert.equal(value, input.publicKey);

      return {
        publicKey: 'clave-publica-normalizada',
        fingerprint: 'f'.repeat(64),
      };
    };

    delete require.cache[servicePath];

    function reset(name) {
      scenario = name;
      events = [];
      executions = [];
    }

    try {
      const {
        registerBiometricDevice,
      } = require('../services/registerBiometricDeviceService');

      reset('success');

      const result = await registerBiometricDevice(input);

      assert.deepEqual(
        events,
        ['begin', 'commit', 'release']
      );

      assert.match(
        result.deviceId,
        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
      );

      assert.match(result.challenge, /^[a-f0-9]{64}$/);
      assert.equal(result.expiresIn, 120);

      assert.equal(
        result.message,
        [
          'lomas-eveneser',
          'biometria',
          'registro',
          1,
          result.deviceId,
          2,
          result.challenge,
        ].join(':')
      );

      const deviceInsert = executions.find(
        (entry) => entry.sql.includes(
          'INSERT INTO mfa_dispositivos'
        )
      );

      assert.deepEqual(deviceInsert.params, [
        result.deviceId,
        1,
        'Teléfono de prueba',
        'android',
        'clave-publica-normalizada',
        'f'.repeat(64),
      ]);

      // No activa el dispositivo durante la preparación.
      assert.equal(
        executions.some(
          (entry) => /SET estado = 'activo'/.test(entry.sql)
        ),
        false
      );

      const challengeInsert = executions.find(
        (entry) => entry.sql.includes(
          'INSERT INTO mfa_desafios_biometricos'
        )
      );

      const expectedHash = crypto
        .createHash('sha256')
        .update(result.challenge, 'utf8')
        .digest('hex');

      assert.deepEqual(challengeInsert.params, [
        1,
        result.deviceId,
        expectedHash,
        result.message,
        2,
      ]);

      assert.match(
        challengeInsert.sql,
        /INTERVAL 2 MINUTE/
      );

      const pendingRevocation = executions.find(
        (entry) => entry.sql.includes(
          'UPDATE mfa_dispositivos'
        )
      );

      assert.match(
        pendingRevocation.sql,
        /estado = 'pendiente'/
      );

      for (const [name, expectedCode] of [
        ['missingUser', 'BIOMETRIC_SESSION_INVALID'],
        ['inactiveUser', 'BIOMETRIC_SESSION_INVALID'],
        ['changedSession', 'BIOMETRIC_SESSION_INVALID'],
        ['missingMfa', 'BIOMETRIC_REGISTRATION_DENIED'],
        ['unconfirmedMfa', 'BIOMETRIC_REGISTRATION_DENIED'],
        ['deviceLimit', 'BIOMETRIC_DEVICE_LIMIT'],
        ['duplicateKey', 'BIOMETRIC_KEY_ALREADY_REGISTERED'],
        ['challengeFailure', null],
      ]) {
        reset(name);

        await assert.rejects(
          () => registerBiometricDevice(input),
          expectedCode
            ? { code: expectedCode }
            : /Fallo simulado de desafío/
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
        [{ name: 'A' }, 'BIOMETRIC_INPUT_INVALID'],
        [{ platform: 'web' }, 'BIOMETRIC_INPUT_INVALID'],
        [{ publicKey: 'invalida' }, 'BIOMETRIC_INPUT_INVALID'],
      ]) {
        reset('invalidInput');

        await assert.rejects(
          () => registerBiometricDevice({
            ...input,
            ...changes,
          }),
          { code: expectedCode }
        );

        assert.deepEqual(events, []);
        assert.deepEqual(executions, []);
      }
    } finally {
      database.getLomasPool = originalGetPool;
      biometricCrypto.normalizeBiometricPublicKey =
        originalNormalize;

      delete require.cache[servicePath];
    }
  }
);