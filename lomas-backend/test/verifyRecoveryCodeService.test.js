const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const database = require('../config/lomasDatabase');

test('recuperación MFA exige desafío vigente, consume una vez y registra intentos', async () => {
  const original = database.getLomasPool;
  const path = require.resolve('../services/verifyRecoveryCodeService');
  const code = '12345678-abcdefab-12345678-abcdefab';
  const hash = crypto.createHash('sha256').update(code.replace(/-/g, '')).digest('hex');
  let scenario = 'valid', used = false, events = [], queries = [];
  const connection = {
    async beginTransaction() { events.push('begin'); },
    async commit() { events.push('commit'); },
    async rollback() { events.push('rollback'); },
    release() { events.push('release'); },
    async execute(sql, params) {
      queries.push(sql);
      if (sql.includes('FROM usuarios')) return [[{ id: 1, estado: scenario === 'inactive' ? 'inactivo' : 'activo', version_sesion: 2 }]];
      if (sql.includes('FROM mfa_desafios')) {
        for (const pattern of [/proposito = 'verificacion'/, /version_sesion = \?/, /vence_en > UTC_TIMESTAMP\(\)/, /intentos_fallidos < 5/, /usado_en IS NULL/]) assert.match(sql, pattern);
        assert.deepEqual(params.slice(1), [1, 2]);
        return [scenario === 'expired' ? [] : [{ id: 2 }]];
      }
      if (sql.includes('FROM mfa_totp')) return [scenario === 'unconfirmed' ? [] : [{ usuario_id: 1 }]];
      if (sql.includes('FROM mfa_codigos_recuperacion')) {
        assert.deepEqual(params, [1, hash]);
        assert.match(sql, /usado_en IS NULL FOR UPDATE/);
        return [used ? [] : [{ id: 3 }]];
      }
      if (sql.startsWith('UPDATE mfa_codigos_recuperacion')) {
        if (scenario === 'writeFailure') throw new Error('Fallo simulado');
        used = true;
      }
      return [{ affectedRows: 1 }];
    },
  };
  database.getLomasPool = () => ({
    async execute() { return [scenario === 'missing' ? [] : [{ usuario_id: 1 }]]; },
    async getConnection() { return connection; },
  });
  delete require.cache[path];
  try {
    const { verifyRecoveryCode } = require(path);
    const input = { challenge: 'a'.repeat(64), code: code.toUpperCase() };
    assert.deepEqual((await verifyRecoveryCode(input)).recoveryCodes, []);
    assert.deepEqual(events, ['begin', 'commit', 'release']);
    assert.ok(queries.some(q => q.startsWith('UPDATE mfa_desafios_biometricos')));
    events = []; queries = [];
    await assert.rejects(verifyRecoveryCode(input), { code: 'MFA_RECOVERY_INVALID' });
    assert.deepEqual(events, ['begin', 'commit', 'release']);
    assert.ok(queries.some(q => q.includes('intentos_fallidos + 1')));
    for (const name of ['inactive', 'expired', 'unconfirmed', 'missing', 'writeFailure']) {
      scenario = name; used = false; events = []; queries = [];
      await assert.rejects(verifyRecoveryCode(input), name === 'writeFailure' ? /Fallo simulado/ : { code: 'MFA_CHALLENGE_INVALID' });
      assert.deepEqual(events, name === 'missing' ? [] : ['begin', 'rollback', 'release']);
    }
    events = [];
    await assert.rejects(verifyRecoveryCode({ ...input, challenge: 'invalido' }), { code: 'MFA_CHALLENGE_INVALID' });
    await assert.rejects(verifyRecoveryCode({ ...input, code: '123456' }), { code: 'MFA_RECOVERY_INVALID' });
    assert.deepEqual(events, []);
  } finally { database.getLomasPool = original; delete require.cache[path]; }
});
