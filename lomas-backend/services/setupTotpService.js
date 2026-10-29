const crypto = require('node:crypto');
const { getLomasPool } = require('../config/lomasDatabase');
const { createTotpEnrollment } = require('./totpService');
const { encryptMfaSecret } = require('./mfaEncryptionService');

function invalidChallenge() {
  const error = new Error(
    'La verificación venció o ya no está disponible. Iniciá sesión nuevamente.'
  );

  error.code = 'MFA_CHALLENGE_INVALID';

  return error;
}

async function setupTotp(challenge) {
  if (
    typeof challenge !== 'string' ||
    !/^[a-f0-9]{64}$/.test(challenge)
  ) {
    throw invalidChallenge();
  }

  const challengeHash = crypto
    .createHash('sha256')
    .update(challenge, 'utf8')
    .digest('hex');

  const pool = getLomasPool();

  // Esta consulta solo identifica la cuenta.
  // La autorización se comprueba dentro de la transacción.
  const [candidates] = await pool.execute(
    `SELECT usuario_id
     FROM mfa_desafios
     WHERE token_hash = ?
     LIMIT 1`,
    [challengeHash]
  );

  const candidate = candidates[0];

  if (!candidate) {
    throw invalidChallenge();
  }

  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    // Mantiene el mismo orden de bloqueo:
    // primero la cuenta y luego sus datos de MFA.
    const [users] = await connection.execute(
      `SELECT id, email, estado, version_sesion
       FROM usuarios
       WHERE id = ?
       FOR UPDATE`,
      [candidate.usuario_id]
    );

    const user = users[0];

    if (!user || user.estado !== 'activo') {
      throw invalidChallenge();
    }

    const [challenges] = await connection.execute(
      `SELECT id
       FROM mfa_desafios
       WHERE token_hash = ?
         AND usuario_id = ?
         AND proposito = 'configuracion'
         AND version_sesion = ?
         AND usado_en IS NULL
         AND vence_en > UTC_TIMESTAMP()
         AND intentos_fallidos < 5
       FOR UPDATE`,
      [
        challengeHash,
        user.id,
        user.version_sesion,
      ]
    );

    if (!challenges[0]) {
      throw invalidChallenge();
    }

    const [settings] = await connection.execute(
      `SELECT confirmado_en
       FROM mfa_totp
       WHERE usuario_id = ?
       FOR UPDATE`,
      [user.id]
    );

    // Un permiso de configuración no puede reemplazar
    // un Authenticator que ya fue confirmado.
    if (settings[0]?.confirmado_en) {
      throw invalidChallenge();
    }

    const enrollment = createTotpEnrollment(user.email);

    const encryptedSecret = encryptMfaSecret(
      enrollment.secret
    );

    if (settings[0]) {
      await connection.execute(
        `UPDATE mfa_totp
         SET secreto_cifrado = ?,
             confirmado_en = NULL,
             configuracion_vence_en =
               DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 MINUTE),
             ultimo_paso_usado = NULL
         WHERE usuario_id = ?`,
        [encryptedSecret, user.id]
      );
    } else {
      await connection.execute(
        `INSERT INTO mfa_totp (
           usuario_id,
           secreto_cifrado,
           configuracion_vence_en
         )
         VALUES (
           ?, ?,
           DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 MINUTE)
         )`,
        [user.id, encryptedSecret]
      );
    }

    await connection.commit();
    transactionStarted = false;

    // Se entrega únicamente al flujo de vinculación.
    // No registrar estos valores en consola.
    return {
      secret: enrollment.secret,
      uri: enrollment.uri,
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch {
        // Conserva el error original.
      }
    }

    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { setupTotp };