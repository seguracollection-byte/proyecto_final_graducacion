const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const database = require('../config/lomasDatabase');
const encryption = require('../services/mfaEncryptionService');
const totp = require('../services/totpService');

test(
  'MFA confirma códigos, registra intentos y protege la configuración',
  async () => {
    const originalGetPool = database.getLomasPool;
    const originalDecrypt = encryption.decryptMfaSecret;
    const originalVerify = totp.verifyTotpCode;

    const servicePath = require.resolve(
      '../services/verifyTotpService'
    );

    const challenge = 'b'.repeat(64);

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

        if (sql.includes('FROM mfa_desafios')) {
          return [
            scenario === 'invalidChallenge'
              ? []
              : [{
                id: 10,
                proposito: scenario === 'login'
                  ? 'verificacion'
                  : 'configuracion',
              }],
          ];
        }

        if (sql.includes('FROM mfa_totp')) {
          if (scenario === 'missingSetting') {
            return [[]];
          }

          return [[{
            secreto_cifrado: 'cifrado-ficticio',
            confirmado_en:
              scenario === 'login' ||
              scenario === 'alreadyConfirmed'
                ? '2026-01-01 12:00:00'
                : null,
            ultimo_paso_usado: null,
            configuracion_vigente:
              scenario === 'expiredSetup' ? 0 : 1,
          }]];
        }

        if (
          scenario === 'writeFailure' &&
          sql.includes('UPDATE mfa_totp')
        ) {
          throw new Error('Fallo simulado de escritura');
        }

        return [{ affectedRows: 1 }];
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
      async execute() {
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

    encryption.decryptMfaSecret = (value) => {
      assert.equal(value, 'cifrado-ficticio');
      return 'secreto-ficticio';
    };

    totp.verifyTotpCode = (options) => {
      assert.equal(options.secret, 'secreto-ficticio');
      assert.equal(options.code, '123456');

      return scenario === 'wrongCode' ? null : 100;
    };

    delete require.cache[servicePath];

    function reset(name) {
      scenario = name;
      events = [];
      executions = [];
    }

    try {
      const {
        verifyTotp,
      } = require('../services/verifyTotpService');

      const input = {
        challenge,
        code: '123456',
      };

      reset('enrollment');

      const enrollment = await verifyTotp(input);

      assert.equal(enrollment.user.id, 1);
      assert.equal(enrollment.user.version_sesion, 2);
      assert.equal(enrollment.recoveryCodes.length, 10);
      assert.equal(
        new Set(enrollment.recoveryCodes).size,
        10
      );

      assert.deepEqual(
        events,
        ['begin', 'commit', 'release']
      );

      const inserts = executions.filter(
        (entry) => entry.sql.includes(
          'INSERT INTO mfa_codigos_recuperacion'
        )
      );

      assert.equal(inserts.length, 10);

      enrollment.recoveryCodes.forEach((code, index) => {
        assert.match(
          code,
          /^[a-f0-9]{8}(?:-[a-f0-9]{8}){3}$/
        );

        const expectedHash = crypto
          .createHash('sha256')
          .update(code.replace(/-/g, ''), 'utf8')
          .digest('hex');

        assert.deepEqual(
          inserts[index].params,
          [1, expectedHash]
        );
      });

      const update = executions.find(
        (entry) => entry.sql.includes('UPDATE mfa_totp')
      );

      assert.deepEqual(update.params, [100, 1]);

      const consumed = executions.find(
        (entry) => (
          entry.sql.includes('UPDATE mfa_desafios') &&
          entry.sql.includes('SET usado_en')
        )
      );

      assert.deepEqual(consumed.params, [1]);

      reset('login');

      const login = await verifyTotp(input);

      assert.deepEqual(login.recoveryCodes, []);
      assert.deepEqual(
        events,
        ['begin', 'commit', 'release']
      );

      assert.equal(
        executions.some(
          (entry) => entry.sql.includes(
            'INSERT INTO mfa_codigos_recuperacion'
          )
        ),
        false
      );

      reset('wrongCode');

      await assert.rejects(
        () => verifyTotp(input),
        { code: 'MFA_CODE_INVALID' }
      );

      // El intento fallido se confirma, no se revierte.
      assert.deepEqual(
        events,
        ['begin', 'commit', 'release']
      );

      assert.ok(
        executions.some(
          (entry) => entry.sql.includes(
            'intentos_fallidos = intentos_fallidos + 1'
          )
        )
      );

      assert.equal(
        executions.some(
          (entry) => entry.sql.includes('UPDATE mfa_totp')
        ),
        false
      );

      for (const name of [
        'missingUser',
        'inactiveUser',
        'invalidChallenge',
        'missingSetting',
        'alreadyConfirmed',
        'expiredSetup',
        'writeFailure',
      ]) {
        reset(name);

        await assert.rejects(
          () => verifyTotp(input),
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
        () => verifyTotp(input),
        { code: 'MFA_CHALLENGE_INVALID' }
      );

      assert.deepEqual(events, []);

      reset('invalidFormat');

      await assert.rejects(
        () => verifyTotp({
          challenge,
          code: '123',
        }),
        { code: 'MFA_CODE_INVALID' }
      );

      assert.deepEqual(events, []);
    } finally {
      database.getLomasPool = originalGetPool;
      encryption.decryptMfaSecret = originalDecrypt;
      totp.verifyTotpCode = originalVerify;
      delete require.cache[servicePath];
    }
  }
);