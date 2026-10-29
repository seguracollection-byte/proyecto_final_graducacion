const crypto = require('node:crypto');
const { getLomasPool } = require('../config/lomasDatabase');
const { decryptMfaSecret } = require('./mfaEncryptionService');
const { verifyTotpCode } = require('./totpService');

function invalidChallenge() {
  const error = new Error(
    'La verificación venció o ya no está disponible. Iniciá sesión nuevamente.'
  );

  error.code = 'MFA_CHALLENGE_INVALID';

  return error;
}

function invalidCode() {
  const error = new Error(
    'Código incorrecto o ya utilizado. Revisá Authenticator.'
  );

  error.code = 'MFA_CODE_INVALID';

  return error;
}

async function verifyTotp({ challenge, code }) {
  if (
    typeof challenge !== 'string' ||
    !/^[a-f0-9]{64}$/.test(challenge)
  ) {
    throw invalidChallenge();
  }

  if (
    typeof code !== 'string' ||
    !/^\d{6}$/.test(code)
  ) {
    throw invalidCode();
  }

  const challengeHash = crypto
    .createHash('sha256')
    .update(challenge, 'utf8')
    .digest('hex');

  const pool = getLomasPool();

  const [candidates] = await pool.execute(
    `SELECT usuario_id
     FROM mfa_desafios
     WHERE token_hash = ?
     LIMIT 1`,
    [challengeHash]
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
      `SELECT id, nombre, email, rol, estado, version_sesion
       FROM usuarios
       WHERE id = ?
       FOR UPDATE`,
      [candidates[0].usuario_id]
    );

    const user = users[0];

    if (!user || user.estado !== 'activo') {
      throw invalidChallenge();
    }

    const [challenges] = await connection.execute(
      `SELECT id, proposito
       FROM mfa_desafios
       WHERE token_hash = ?
         AND usuario_id = ?
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

    const pendingChallenge = challenges[0];

    if (!pendingChallenge) {
      throw invalidChallenge();
    }

    const [settings] = await connection.execute(
      `SELECT secreto_cifrado,
              confirmado_en,
              ultimo_paso_usado,
              (
                configuracion_vence_en > UTC_TIMESTAMP()
              ) AS configuracion_vigente
       FROM mfa_totp
       WHERE usuario_id = ?
       FOR UPDATE`,
      [user.id]
    );

    const setting = settings[0];

    if (!setting) {
      throw invalidChallenge();
    }

    const configuring =
      pendingChallenge.proposito === 'configuracion';

    if (configuring) {
      if (
        setting.confirmado_en ||
        Number(setting.configuracion_vigente) !== 1
      ) {
        throw invalidChallenge();
      }
    } else if (
      pendingChallenge.proposito !== 'verificacion' ||
      !setting.confirmado_en
    ) {
      throw invalidChallenge();
    }

    const secret = decryptMfaSecret(
      setting.secreto_cifrado
    );

    const lastUsedStep = setting.ultimo_paso_usado === null
      ? null
      : Number(setting.ultimo_paso_usado);

    const acceptedStep = verifyTotpCode({
      secret,
      code,
      lastUsedStep,
    });

    if (acceptedStep === null) {
      await connection.execute(
        `UPDATE mfa_desafios
         SET intentos_fallidos = intentos_fallidos + 1
         WHERE id = ?`,
        [pendingChallenge.id]
      );

      // El intento fallido debe quedar registrado.
      await connection.commit();
      transactionStarted = false;

      throw invalidCode();
    }

    await connection.execute(
      `UPDATE mfa_totp
       SET confirmado_en = COALESCE(
             confirmado_en,
             UTC_TIMESTAMP()
           ),
           ultimo_paso_usado = ?
       WHERE usuario_id = ?`,
      [acceptedStep, user.id]
    );

    const recoveryCodes = [];

    if (configuring) {
      // Reemplaza cualquier conjunto anterior de emergencia.
      await connection.execute(
        `DELETE FROM mfa_codigos_recuperacion
         WHERE usuario_id = ?`,
        [user.id]
      );

      for (let index = 0; index < 10; index += 1) {
        const rawCode = crypto
          .randomBytes(16)
          .toString('hex');

        const codeHash = crypto
          .createHash('sha256')
          .update(rawCode, 'utf8')
          .digest('hex');

        await connection.execute(
          `INSERT INTO mfa_codigos_recuperacion (
             usuario_id,
             codigo_hash
           )
           VALUES (?, ?)`,
          [user.id, codeHash]
        );

        recoveryCodes.push(
          rawCode.match(/.{8}/g).join('-')
        );
      }
    }

    await connection.execute(
      `UPDATE mfa_desafios
       SET usado_en = UTC_TIMESTAMP()
       WHERE usuario_id = ?
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
      recoveryCodes,
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

module.exports = { verifyTotp };