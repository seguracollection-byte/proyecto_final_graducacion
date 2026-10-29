const crypto = require('node:crypto');
const { getLomasPool } = require('../config/lomasDatabase');

function invalidChallenge() {
  const error = new Error(
    'La verificación o el dispositivo ya no están disponibles. Iniciá sesión nuevamente.'
  );

  error.code = 'BIOMETRIC_CHALLENGE_INVALID';

  return error;
}

async function createBiometricLoginChallenge({
  challenge,
  deviceId,
}) {
  if (
    typeof challenge !== 'string' ||
    !/^[a-f0-9]{64}$/.test(challenge) ||
    typeof deviceId !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      deviceId
    )
  ) {
    throw invalidChallenge();
  }

  const loginChallengeHash = crypto
    .createHash('sha256')
    .update(challenge, 'utf8')
    .digest('hex');

  const pool = getLomasPool();

  // Solo identifica la cuenta; la autorización se comprueba
  // dentro de la transacción.
  const [candidates] = await pool.execute(
    `SELECT usuario_id
     FROM mfa_desafios
     WHERE token_hash = ?
     LIMIT 1`,
    [loginChallengeHash]
  );

  if (!candidates[0]) {
    throw invalidChallenge();
  }

  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [users] = await connection.execute(
      `SELECT id, estado, version_sesion
       FROM usuarios
       WHERE id = ?
       FOR UPDATE`,
      [candidates[0].usuario_id]
    );

    const user = users[0];

    if (!user || user.estado !== 'activo') {
      throw invalidChallenge();
    }

    const [loginChallenges] = await connection.execute(
      `SELECT id, vence_en
       FROM mfa_desafios
       WHERE token_hash = ?
         AND usuario_id = ?
         AND version_sesion = ?
         AND proposito = 'verificacion'
         AND usado_en IS NULL
         AND vence_en > UTC_TIMESTAMP()
         AND intentos_fallidos < 5
       FOR UPDATE`,
      [
        loginChallengeHash,
        user.id,
        user.version_sesion,
      ]
    );

    const loginChallenge = loginChallenges[0];

    if (!loginChallenge) {
      throw invalidChallenge();
    }

    const [devices] = await connection.execute(
      `SELECT id
       FROM mfa_dispositivos
       WHERE id = ?
         AND usuario_id = ?
         AND estado = 'activo'
         AND algoritmo = 'RSA2048_SHA256'
       FOR UPDATE`,
      [deviceId, user.id]
    );

    if (!devices[0]) {
      throw invalidChallenge();
    }

    // Solo mantiene un desafío biométrico pendiente
    // para este intento de inicio de sesión.
    await connection.execute(
      `UPDATE mfa_desafios_biometricos
       SET usado_en = UTC_TIMESTAMP()
       WHERE desafio_mfa_id = ?
         AND proposito = 'ingreso'
         AND usado_en IS NULL`,
      [loginChallenge.id]
    );

    const biometricChallenge = crypto
      .randomBytes(32)
      .toString('hex');

    const biometricChallengeHash = crypto
      .createHash('sha256')
      .update(biometricChallenge, 'utf8')
      .digest('hex');

    const message = [
      'lomas-eveneser',
      'biometria',
      'ingreso',
      user.id,
      deviceId,
      loginChallenge.id,
      user.version_sesion,
      biometricChallenge,
    ].join(':');

    await connection.execute(
      `INSERT INTO mfa_desafios_biometricos (
         usuario_id,
         dispositivo_id,
         desafio_mfa_id,
         token_hash,
         mensaje,
         proposito,
         version_sesion,
         vence_en
       )
       VALUES (
         ?, ?, ?, ?, ?, 'ingreso', ?,
         LEAST(
           DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 MINUTE),
           ?
         )
       )`,
      [
        user.id,
        deviceId,
        loginChallenge.id,
        biometricChallengeHash,
        message,
        user.version_sesion,
        loginChallenge.vence_en,
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return {
      challenge: biometricChallenge,
      message,
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

module.exports = { createBiometricLoginChallenge };