const crypto = require('node:crypto');
const { getLomasPool } = require('../config/lomasDatabase');

function failure(code) {
  const error = new Error(code === 'MFA_CHALLENGE_INVALID'
    ? 'La verificación venció. Iniciá sesión nuevamente.'
    : 'Código de recuperación incorrecto o ya utilizado.');
  error.code = code;
  return error;
}

// Siempre exige el desafío emitido DESPUÉS de comprobar la contraseña.
// El bloqueo de usuario serializa este ingreso con TOTP y biometría.
async function verifyRecoveryCode({ challenge, code }) {
  if (typeof challenge !== 'string' || !/^[a-f0-9]{64}$/.test(challenge)) {
    throw failure('MFA_CHALLENGE_INVALID');
  }
  if (typeof code !== 'string' || code.length > 64) {
    throw failure('MFA_RECOVERY_INVALID');
  }
  const normalized = code.trim().toLowerCase();
  if (!/^(?:[a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{8}){3})$/.test(normalized)) {
    throw failure('MFA_RECOVERY_INVALID');
  }
  const hash = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');
  const challengeHash = hash(challenge);
  const pool = getLomasPool();
  const [candidates] = await pool.execute(
    'SELECT usuario_id FROM mfa_desafios WHERE token_hash = ? LIMIT 1',
    [challengeHash]
  );
  if (!candidates[0]) throw failure('MFA_CHALLENGE_INVALID');
  const connection = await pool.getConnection();
  let transaction = false;
  try {
    await connection.beginTransaction();
    transaction = true;
    const [users] = await connection.execute(
      'SELECT id, nombre, email, rol, estado, version_sesion FROM usuarios WHERE id = ? FOR UPDATE',
      [candidates[0].usuario_id]
    );
    const user = users[0];
    if (!user || user.estado !== 'activo') throw failure('MFA_CHALLENGE_INVALID');
    const [challenges] = await connection.execute(
      `SELECT id FROM mfa_desafios WHERE token_hash = ? AND usuario_id = ?
       AND version_sesion = ? AND proposito = 'verificacion'
       AND usado_en IS NULL AND vence_en > UTC_TIMESTAMP()
       AND intentos_fallidos < 5 FOR UPDATE`,
      [challengeHash, user.id, user.version_sesion]
    );
    if (!challenges[0]) throw failure('MFA_CHALLENGE_INVALID');
    const [settings] = await connection.execute(
      'SELECT usuario_id FROM mfa_totp WHERE usuario_id = ? AND confirmado_en IS NOT NULL FOR UPDATE',
      [user.id]
    );
    if (!settings[0]) throw failure('MFA_CHALLENGE_INVALID');
    const [codes] = await connection.execute(
      `SELECT id FROM mfa_codigos_recuperacion
       WHERE usuario_id = ? AND codigo_hash = ? AND usado_en IS NULL FOR UPDATE`,
      [user.id, hash(normalized.replace(/-/g, ''))]
    );
    if (!codes[0]) {
      await connection.execute(
        'UPDATE mfa_desafios SET intentos_fallidos = intentos_fallidos + 1 WHERE id = ?',
        [challenges[0].id]
      );
      await connection.commit();
      transaction = false;
      throw failure('MFA_RECOVERY_INVALID');
    }
    const [consumed] = await connection.execute(
      'UPDATE mfa_codigos_recuperacion SET usado_en = UTC_TIMESTAMP() WHERE id = ? AND usado_en IS NULL',
      [codes[0].id]
    );
    if (consumed.affectedRows !== 1) throw failure('MFA_RECOVERY_INVALID');
    await connection.execute(
      'UPDATE mfa_desafios SET usado_en = UTC_TIMESTAMP() WHERE usuario_id = ? AND usado_en IS NULL',
      [user.id]
    );
    await connection.execute(
      'UPDATE mfa_desafios_biometricos SET usado_en = UTC_TIMESTAMP() WHERE usuario_id = ? AND usado_en IS NULL',
      [user.id]
    );
    await connection.commit();
    transaction = false;
    return { user, recoveryCodes: [] };
  } catch (error) {
    if (transaction) {
      try { await connection.rollback(); } catch { /* Conserva el error original. */ }
    }
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { verifyRecoveryCode };
