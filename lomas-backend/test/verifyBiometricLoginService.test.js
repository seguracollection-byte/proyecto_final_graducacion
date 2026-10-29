const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const database = require('../config/lomasDatabase');
const biometricCrypto = require('../services/biometricCryptoService');

test(
  'ingreso biométrico valida ambos desafíos y consume los permisos',
  async () => {
    const originalGetPool = database.getLomasPool;
    const originalVerify =
      biometricCrypto.verifyBiometricSignature;

    const servicePath = require.resolve(
      '../services/verifyBiometricLoginService'
    );

    const input = {
      challenge: 'e'.repeat(64),
      signature: 'firma-ficticia',
    };

    const expectedHash = crypto
      .createHash('sha256')
      .update(input.challenge, 'utf8')
      .digest('hex');

    let scenario;
    let events;
    let executions;
    let lookups;
    let signatureCalls;

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
                nombre: 'Persona Prueba',
                email: 'prueba@example.com',
                rol: 'usuario',
                estado: scenario === 'inactiveUser'
                  ? 'inactivo'
                  : 'activo',
                version_sesion: 2,
              }],
          ];
        }

        if (sql.includes('FROM mfa_desafios_biometricos')) {
          return [
            scenario === 'invalidBiometricChallenge'
              ? []
              : [{
                id: 20,
                dispositivo_id: 'dispositivo-ficticio',
                mensaje: 'mensaje-guardado-por-el-servidor',
              }],
          ];
        }

        if (sql.includes('FROM mfa_desafios')) {
          return [
            scenario === 'invalidLoginChallenge'
              ? []
              : [{ id: 10 }],
          ];
        }

        if (sql.includes('FROM mfa_dispositivos')) {
          return [
            scenario === 'invalidDevice'
              ? []
              : [{
                id: 'dispositivo-ficticio',
                clave_publica: 'clave-publica-ficticia',
              }],
          ];
        }

        if (
          scenario === 'writeFailure' &&
          sql.includes('UPDATE mfa_dispositivos')
        ) {
          throw new Error('Fallo simulado de escritura');
        }

        if (sql.includes('UPDATE ')) {
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
            : [{
              usuario_id: 1,
              desafio_mfa_id: 10,
            }],
        ];
      },

      async getConnection() {
        return connection;
      },
    });

    biometricCrypto.verifyBiometricSignature = (options) => {
      signatureCalls += 1;

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
      lookups = [];
      signatureCalls = 0;
    }

    try {
      const {
        verifyBiometricLogin,
      } = require('../services/verifyBiometricLoginService');

      reset('success');

      const result = await verifyBiometricLogin(input);

      assert.deepEqual(result, {
        user: {
          id: 1,
          nombre: 'Persona Prueba',
          email: 'prueba@example.com',
          rol: 'usuario',
          version_sesion: 2,
        },
      });

      assert.equal(signatureCalls, 1);
      assert.deepEqual(lookups[0].params, [expectedHash]);

      assert.deepEqual(
        events,
        ['begin', 'commit', 'release']
      );

      const parent = executions.find(
        (entry) => (
          entry.sql.includes('FROM mfa_desafios') &&
          !entry.sql.includes('FROM mfa_desafios_biometricos')
        )
      );

      assert.deepEqual(parent.params, [10, 1, 2]);
      assert.match(parent.sql, /proposito = 'verificacion'/);

      const biometric = executions.find(
        (entry) => entry.sql.includes(
          'FROM mfa_desafios_biometricos'
        )
      );

      assert.deepEqual(
        biometric.params,
        [expectedHash, 1, 10, 2]
      );

      for (const lookup of [parent, biometric]) {
        assert.match(lookup.sql, /usado_en IS NULL/);
        assert.match(lookup.sql, /intentos_fallidos < 5/);
        assert.match(
          lookup.sql,
          /vence_en > UTC_TIMESTAMP\(\)/
        );
      }

      const device = executions.find(
        (entry) => entry.sql.includes('FROM mfa_dispositivos')
      );

      assert.deepEqual(
        device.params,
        ['dispositivo-ficticio', 1]
      );
      assert.match(device.sql, /estado = 'activo'/);

      const consumed = executions.filter(
        (entry) => entry.sql.includes(
          'SET usado_en = UTC_TIMESTAMP()'
        )
      );

      assert.equal(consumed.length, 2);

      for (const entry of consumed) {
        assert.deepEqual(entry.params, [1]);
      }

      reset('invalidSignature');

      await assert.rejects(
        () => verifyBiometricLogin(input),
        { code: 'BIOMETRIC_SIGNATURE_INVALID' }
      );

      assert.deepEqual(
        events,
        ['begin', 'commit', 'release']
      );

      const failedAttempts = executions.filter(
        (entry) => entry.sql.includes(
          'intentos_fallidos = intentos_fallidos + 1'
        )
      );

      assert.equal(failedAttempts.length, 2);
      assert.deepEqual(failedAttempts[0].params, [20]);
      assert.deepEqual(failedAttempts[1].params, [10]);

      assert.equal(
        executions.some(
          (entry) => entry.sql.includes('UPDATE mfa_dispositivos')
        ),
        false
      );

      for (const name of [
        'missingUser',
        'inactiveUser',
        'invalidLoginChallenge',
        'invalidBiometricChallenge',
        'invalidDevice',
        'writeFailure',
      ]) {
        reset(name);

        await assert.rejects(
          () => verifyBiometricLogin(input),
          name === 'writeFailure'
            ? /Fallo simulado de escritura/
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
        () => verifyBiometricLogin(input),
        { code: 'BIOMETRIC_CHALLENGE_INVALID' }
      );

      assert.deepEqual(events, []);

      for (const [changes, expectedCode] of [
        [{ challenge: 'invalido' }, 'BIOMETRIC_CHALLENGE_INVALID'],
        [{ signature: '' }, 'BIOMETRIC_SIGNATURE_INVALID'],
      ]) {
        reset('invalidInput');

        await assert.rejects(
          () => verifyBiometricLogin({
            ...input,
            ...changes,
          }),
          { code: expectedCode }
        );

        assert.deepEqual(lookups, []);
        assert.deepEqual(events, []);
      }
    } finally {
      database.getLomasPool = originalGetPool;
      biometricCrypto.verifyBiometricSignature = originalVerify;
      delete require.cache[servicePath];
    }
  }
);