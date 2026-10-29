const crypto = require('node:crypto');
const { getLomasPool } = require('../config/lomasDatabase');

const {
  verifyBiometricSignature,
} = require('./biometricCryptoService');

function invalidChallenge() {
  const error = new Error(
    'La verificación venció o ya no está disponible. Iniciá sesión nuevamente.'
  );

  error.code = 'BIOMETRIC_CHALLENGE_INVALID';

  return error;
}

function invalidSignature() {
  const error = new Error(
    'No se pudo comprobar la firma del dispositivo.'
  );

  error.code = 'BIOMETRIC_SIGNATURE_INVALID';

  return error;
}

async function verifyBiometricLogin({
  challenge,
  signature,
}) {
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
    throw invalidSignature();
  }

  const challengeHash = crypto
    .createHash('sha256')
    .update(challenge, 'utf8')
    .digest('hex');

  const pool = getLomasPool();

  const [candidates] = await pool.execute(
    `SELECT usuario_id, desafio_mfa_id
     FROM mfa_desafios_biometricos
     WHERE token_hash = ?
       AND proposito = 'ingreso'
     LIMIT 1`,
    [challengeHash]
  );

  const candidate = candidates[0];

  if (!candidate || !candidate.desafio_mfa_id) {
    throw invalidChallenge();
  }

  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [users] = await connection.execute(
      `SELECT id, nombre, email, rol, estado, version_sesion
       FROM usuarios
       WHERE id = ?
       FOR UPDATE`,
      [candidate.usuario_id]
    );

    const user = users[0];

    if (!user || user.estado !== 'activo') {
      throw invalidChallenge();
    }

    const [loginChallenges] = await connection.execute(
      `SELECT id
       FROM mfa_desafios
       WHERE id = ?
         AND usuario_id = ?
         AND version_sesion = ?
         AND proposito = 'verificacion'
         AND usado_en IS NULL
         AND vence_en > UTC_TIMESTAMP()
         AND intentos_fallidos < 5
       FOR UPDATE`,
      [
        candidate.desafio_mfa_id,
        user.id,
        user.version_sesion,
      ]
    );

    const loginChallenge = loginChallenges[0];

    if (!loginChallenge) {
      throw invalidChallenge();
    }

    const [biometricChallenges] = await connection.execute(
      `SELECT id, dispositivo_id, mensaje
       FROM mfa_desafios_biometricos
       WHERE token_hash = ?
         AND usuario_id = ?
         AND desafio_mfa_id = ?
         AND version_sesion = ?
         AND proposito = 'ingreso'
         AND usado_en IS NULL
         AND vence_en > UTC_TIMESTAMP()
         AND intentos_fallidos < 5
       FOR UPDATE`,
      [
        challengeHash,
        user.id,
        loginChallenge.id,
        user.version_sesion,
      ]
    );

    const biometricChallenge = biometricChallenges[0];

    if (!biometricChallenge) {
      throw invalidChallenge();
    }

    const [devices] = await connection.execute(
      `SELECT id, clave_publica
       FROM mfa_dispositivos
       WHERE id = ?
         AND usuario_id = ?
         AND estado = 'activo'
         AND algoritmo = 'RSA2048_SHA256'
       FOR UPDATE`,
      [biometricChallenge.dispositivo_id, user.id]
    );

    const device = devices[0];

    if (!device) {
      throw invalidChallenge();
    }

    const valid = verifyBiometricSignature({
      publicKey: device.clave_publica,
      message: biometricChallenge.mensaje,
      signature,
    });

    if (!valid) {
      await connection.execute(
        `UPDATE mfa_desafios_biometricos
         SET intentos_fallidos = intentos_fallidos + 1
         WHERE id = ?`,
        [biometricChallenge.id]
      );

      // También cuenta el fallo en el permiso original.
      // Pedir otro desafío biométrico no reinicia este límite.
      await connection.execute(
        `UPDATE mfa_desafios
         SET intentos_fallidos = intentos_fallidos + 1
         WHERE id = ?`,
        [loginChallenge.id]
      );

      await connection.commit();
      transactionStarted = false;

      throw invalidSignature();
    }

    await connection.execute(
      `UPDATE mfa_dispositivos
       SET ultimo_uso_en = UTC_TIMESTAMP()
       WHERE id = ?
         AND usuario_id = ?`,
      [device.id, user.id]
    );

    await connection.execute(
      `UPDATE mfa_desafios
       SET usado_en = UTC_TIMESTAMP()
       WHERE usuario_id = ?
         AND usado_en IS NULL`,
      [user.id]
    );

    await connection.execute(
      `UPDATE mfa_desafios_biometricos
       SET usado_en = UTC_TIMESTAMP()
       WHERE usuario_id = ?
         AND proposito = 'ingreso'
         AND usado_en IS NULL`,
      [user.id]
    );

    await connection.commit();
    transactionStarted = false;

    return {
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        version_sesion: user.version_sesion,
      },
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

module.exports = { verifyBiometricLogin };