const crypto = require('node:crypto');
const { getLomasPool } = require('../config/lomasDatabase');

const {
  normalizeBiometricPublicKey,
} = require('./biometricCryptoService');

function registrationError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function registerBiometricDevice({
  userId,
  sessionVersion,
  publicKey,
  name,
  platform,
}) {
  if (
    !Number.isSafeInteger(userId) ||
    userId <= 0 ||
    !Number.isSafeInteger(sessionVersion) ||
    sessionVersion <= 0
  ) {
    throw registrationError(
      'Sesión inválida.',
      'BIOMETRIC_SESSION_INVALID'
    );
  }

  if (
    typeof name !== 'string' ||
    name.trim().length < 2 ||
    name.trim().length > 100 ||
    !['android', 'ios'].includes(platform)
  ) {
    throw registrationError(
      'Revisá los datos del dispositivo.',
      'BIOMETRIC_INPUT_INVALID'
    );
  }

  let normalized;

  try {
    normalized = normalizeBiometricPublicKey(publicKey);
  } catch {
    throw registrationError(
      'La clave pública del dispositivo es inválida.',
      'BIOMETRIC_INPUT_INVALID'
    );
  }

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
      throw registrationError(
        'La sesión ya no está disponible.',
        'BIOMETRIC_SESSION_INVALID'
      );
    }

    const [settings] = await connection.execute(
      `SELECT confirmado_en
       FROM mfa_totp
       WHERE usuario_id = ?
       FOR UPDATE`,
      [userId]
    );

    if (!settings[0]?.confirmado_en) {
      throw registrationError(
        'Primero configurá y confirmá Authenticator.',
        'BIOMETRIC_REGISTRATION_DENIED'
      );
    }

    const [devices] = await connection.execute(
      `SELECT id
       FROM mfa_dispositivos
       WHERE usuario_id = ?
         AND estado = 'activo'
       FOR UPDATE`,
      [userId]
    );

    if (devices.length >= 10) {
      throw registrationError(
        'La cuenta alcanzó el límite de dispositivos vinculados.',
        'BIOMETRIC_DEVICE_LIMIT'
      );
    }

    // Un nuevo registro reemplaza los registros pendientes,
    // sin modificar los dispositivos que ya están activos.
    await connection.execute(
      `UPDATE mfa_desafios_biometricos
       SET usado_en = UTC_TIMESTAMP()
       WHERE usuario_id = ?
         AND proposito = 'registro'
         AND usado_en IS NULL`,
      [userId]
    );

    await connection.execute(
      `UPDATE mfa_dispositivos
       SET estado = 'revocado',
           revocado_en = UTC_TIMESTAMP()
       WHERE usuario_id = ?
         AND estado = 'pendiente'`,
      [userId]
    );

    const deviceId = crypto.randomUUID();
    const challenge = crypto.randomBytes(32).toString('hex');

    const challengeHash = crypto
      .createHash('sha256')
      .update(challenge, 'utf8')
      .digest('hex');

    const message = [
      'lomas-eveneser',
      'biometria',
      'registro',
      userId,
      deviceId,
      sessionVersion,
      challenge,
    ].join(':');

    await connection.execute(
      `INSERT INTO mfa_dispositivos (
         id,
         usuario_id,
         nombre,
         plataforma,
         clave_publica,
         huella_clave
       )
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        deviceId,
        userId,
        name.trim(),
        platform,
        normalized.publicKey,
        normalized.fingerprint,
      ]
    );

    await connection.execute(
      `INSERT INTO mfa_desafios_biometricos (
         usuario_id,
         dispositivo_id,
         token_hash,
         mensaje,
         proposito,
         version_sesion,
         vence_en
       )
       VALUES (
         ?, ?, ?, ?, 'registro', ?,
         DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 MINUTE)
       )`,
      [
        userId,
        deviceId,
        challengeHash,
        message,
        sessionVersion,
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return {
      deviceId,
      challenge,
      message,
      expiresIn: 120,
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch {
        // Conserva el error original.
      }
    }

    if (error.code === 'ER_DUP_ENTRY') {
      throw registrationError(
        'Esta clave de dispositivo ya está registrada. Generá una nueva vinculación.',
        'BIOMETRIC_KEY_ALREADY_REGISTERED'
      );
    }

    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { registerBiometricDevice };