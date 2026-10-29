const crypto = require('node:crypto');
const { getLomasPool } = require('../config/lomasDatabase');

const {
  verifyBiometricSignature,
} = require('./biometricCryptoService');

function biometricError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function invalidChallenge() {
  return biometricError(
    'La vinculación venció o ya no está disponible. Iniciá una nueva.',
    'BIOMETRIC_CHALLENGE_INVALID'
  );
}

async function confirmBiometricDevice({
  userId,
  sessionVersion,
  challenge,
  signature,
}) {
  if (
    !Number.isSafeInteger(userId) ||
    userId <= 0 ||
    !Number.isSafeInteger(sessionVersion) ||
    sessionVersion <= 0
  ) {
    throw biometricError(
      'Sesión inválida.',
      'BIOMETRIC_SESSION_INVALID'
    );
  }

  if (
    typeof challenge !== 'string' ||
    !/^[a-f0-9]{64}$/.test(challenge)
  ) {
    throw invalidChallenge();
  }

  if (
    typeof signature !== 'string' ||
    signature.length === 0 ||
    signature.length > 512
  ) {
    throw biometricError(
      'La firma del dispositivo es inválida.',
      'BIOMETRIC_SIGNATURE_INVALID'
    );
  }

  const challengeHash = crypto
    .createHash('sha256')
    .update(challenge, 'utf8')
    .digest('hex');

  const connection = await getLomasPool().getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [users] = await connection.execute(
      `SELECT id, estado, version_sesion
       FROM usuarios
       WHERE id = ?
       FOR UPDATE`,
      [userId]
    );

    const user = users[0];

    if (
      !user ||
      user.estado !== 'activo' ||
      user.version_sesion !== sessionVersion
    ) {
      throw biometricError(
        'La sesión ya no está disponible.',
        'BIOMETRIC_SESSION_INVALID'
      );
    }

    const [challenges] = await connection.execute(
      `SELECT id, dispositivo_id, mensaje
       FROM mfa_desafios_biometricos
       WHERE token_hash = ?
         AND usuario_id = ?
         AND version_sesion = ?
         AND proposito = 'registro'
         AND usado_en IS NULL
         AND vence_en > UTC_TIMESTAMP()
         AND intentos_fallidos < 5
       FOR UPDATE`,
      [challengeHash, userId, sessionVersion]
    );

    const pendingChallenge = challenges[0];

    if (!pendingChallenge) {
      throw invalidChallenge();
    }

    const [devices] = await connection.execute(
      `SELECT id, nombre, clave_publica
       FROM mfa_dispositivos
       WHERE id = ?
         AND usuario_id = ?
         AND estado = 'pendiente'
         AND algoritmo = 'RSA2048_SHA256'
       FOR UPDATE`,
      [pendingChallenge.dispositivo_id, userId]
    );

    const device = devices[0];

    if (!device) {
      throw invalidChallenge();
    }

    const validSignature = verifyBiometricSignature({
      publicKey: device.clave_publica,
      message: pendingChallenge.mensaje,
      signature,
    });

    if (!validSignature) {
      await connection.execute(
        `UPDATE mfa_desafios_biometricos
         SET intentos_fallidos = intentos_fallidos + 1
         WHERE id = ?`,
        [pendingChallenge.id]
      );

      // Conserva el intento fallido en la base de datos.
      await connection.commit();
      transactionStarted = false;

      throw biometricError(
        'No se pudo comprobar la firma del dispositivo.',
        'BIOMETRIC_SIGNATURE_INVALID'
      );
    }

    await connection.execute(
      `UPDATE mfa_dispositivos
       SET estado = 'activo',
           confirmado_en = UTC_TIMESTAMP()
       WHERE id = ?
         AND usuario_id = ?
         AND estado = 'pendiente'`,
      [device.id, userId]
    );

    await connection.execute(
      `UPDATE mfa_desafios_biometricos
       SET usado_en = UTC_TIMESTAMP()
       WHERE id = ?`,
      [pendingChallenge.id]
    );

    await connection.commit();
    transactionStarted = false;

    return {
      deviceId: device.id,
      name: device.nombre,
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

module.exports = { confirmBiometricDevice };