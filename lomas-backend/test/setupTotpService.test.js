const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const database = require('../config/lomasDatabase');
const totpService = require('../services/totpService');
const encryptionService = require('../services/mfaEncryptionService');

test(
  'configuración MFA valida el permiso y protege cuentas confirmadas',
  async () => {
    const originalGetPool = database.getLomasPool;
    const originalEnrollment = totpService.createTotpEnrollment;
    const originalEncrypt = encryptionService.encryptMfaSecret;

    const servicePath = require.resolve(
      '../services/setupTotpService'
    );

    const challenge = 'a'.repeat(64);

    const expectedHash = crypto
      .createHash('sha256')
      .update(challenge, 'utf8')
      .digest('hex');

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
          if (scenario === 'missingUser') {
            return [[]];
          }

          return [[{
            id: 1,
            email: 'prueba@example.com',
            estado: scenario === 'inactiveUser'
              ? 'inactivo'
              : 'activo',
            version_sesion: 2,
          }]];
        }

        if (sql.includes('FROM mfa_desafios')) {
          return [
            scenario === 'invalidChallenge'
              ? []
              : [{ id: 10 }],
          ];
        }

        if (sql.includes('FROM mfa_totp')) {
          if (scenario === 'alreadyConfirmed') {
            return [[{
              confirmado_en: '2026-01-01 12:00:00',
            }]];
          }

          return [
            scenario === 'replacePending'
              ? [{ confirmado_en: null }]
              : [],
          ];
        }

        if (
          sql.includes('INSERT INTO mfa_totp') ||
          sql.includes('UPDATE mfa_totp')
        ) {
          if (scenario === 'writeFailure') {
            throw new Error('Fallo simulado de escritura');
          }

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

    totpService.createTotpEnrollment = (email) => {
      assert.equal(email, 'prueba@example.com');

      return {
        secret: 'SECRETO-FICTICIO',
        uri: 'otpauth://totp/PRUEBA',
      };
    };

    encryptionService.encryptMfaSecret = (secret) => {
      assert.equal(secret, 'SECRETO-FICTICIO');
      return 'contenido-cifrado-ficticio';
    };

    delete require.cache[servicePath];

    function reset(name) {
      scenario = name;
      events = [];
      executions = [];
      lookups = [];
    }

    try {
      const {
        setupTotp,
      } = require('../services/setupTotpService');

      for (const name of ['newSetup', 'replacePending']) {
        reset(name);

        const result = await setupTotp(challenge);

        assert.deepEqual(result, {
          secret: 'SECRETO-FICTICIO',
          uri: 'otpauth://totp/PRUEBA',
        });

        assert.deepEqual(
          events,
          ['begin', 'commit', 'release']
        );

        assert.deepEqual(lookups[0].params, [expectedHash]);

        const validation = executions.find(
          (entry) => entry.sql.includes('FROM mfa_desafios')
        );

        assert.deepEqual(
          validation.params,
          [expectedHash, 1, 2]
        );

        assert.match(
          validation.sql,
          /proposito = 'configuracion'/
        );
        assert.match(validation.sql, /usado_en IS NULL/);
        assert.match(
          validation.sql,
          /vence_en > UTC_TIMESTAMP\(\)/
        );
        assert.match(
          validation.sql,
          /intentos_fallidos < 5/
        );

        const write = executions.find(
          (entry) => (
            entry.sql.includes('INSERT INTO mfa_totp') ||
            entry.sql.includes('UPDATE mfa_totp')
          )
        );

        assert.deepEqual(
          write.params,
          name === 'newSetup'
            ? [1, 'contenido-cifrado-ficticio']
            : ['contenido-cifrado-ficticio', 1]
        );

        assert.equal(
          write.params.includes('SECRETO-FICTICIO'),
          false
        );
      }

      for (const name of [
        'missingUser',
        'inactiveUser',
        'invalidChallenge',
        'alreadyConfirmed',
        'writeFailure',
      ]) {
        reset(name);

        await assert.rejects(
          () => setupTotp(challenge),
          name === 'writeFailure'
            ? /Fallo simulado de escritura/
            : { code: 'MFA_CHALLENGE_INVALID' }
        );

        assert.deepEqual(
          events,
          ['begin', 'rollback', 'release'],
          name
        );
      }

      reset('missingChallenge');

      await assert.rejects(
        () => setupTotp(challenge),
        { code: 'MFA_CHALLENGE_INVALID' }
      );

      assert.deepEqual(events, []);

      reset('invalidFormat');

      await assert.rejects(
        () => setupTotp('invalido'),
        { code: 'MFA_CHALLENGE_INVALID' }
      );

      assert.deepEqual(lookups, []);
      assert.deepEqual(events, []);
    } finally {
      database.getLomasPool = originalGetPool;
      totpService.createTotpEnrollment = originalEnrollment;
      encryptionService.encryptMfaSecret = originalEncrypt;
      delete require.cache[servicePath];
    }
  }
);