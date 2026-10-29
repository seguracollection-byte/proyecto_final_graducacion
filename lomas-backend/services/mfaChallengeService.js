const crypto = require('node:crypto');
const { getLomasPool } = require('../config/lomasDatabase');

const CHALLENGE_SECONDS = 300;

async function createMfaChallenge(verifiedUser) {
  if (
    !verifiedUser ||
    !Number.isSafeInteger(verifiedUser.id) ||
    verifiedUser.id <= 0 ||
    !Number.isSafeInteger(verifiedUser.version_sesion) ||
    verifiedUser.version_sesion <= 0 ||
    typeof verifiedUser.password_hash !== 'string' ||
    verifiedUser.password_hash.length === 0
  ) {
    throw new Error('Cuenta de verificación inválida');
  }

  const connection = await getLomasPool().getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    // Comprueba que la cuenta no haya cambiado desde
    // que se verificó su contraseña.
    const [users] = await connection.execute(
      `SELECT id, estado, password_hash, version_sesion
       FROM usuarios
       WHERE id = ?
       FOR UPDATE`,
      [verifiedUser.id]
    );

    const currentUser = users[0];

    if (
      !currentUser ||
      currentUser.estado !== 'activo' ||
      currentUser.version_sesion !== verifiedUser.version_sesion ||
      currentUser.password_hash !== verifiedUser.password_hash
    ) {
      throw new Error('La cuenta cambió durante el inicio de sesión');
    }

    const [settings] = await connection.execute(
      `SELECT confirmado_en
       FROM mfa_totp
       WHERE usuario_id = ?
       FOR UPDATE`,
      [currentUser.id]
    );

    const purpose = settings[0]?.confirmado_en
      ? 'verificacion'
      : 'configuracion';

    // Un nuevo inicio de sesión reemplaza los desafíos
    // anteriores que todavía no se habían completado.
    await connection.execute(
      `UPDATE mfa_desafios
       SET usado_en = UTC_TIMESTAMP()
       WHERE usuario_id = ?
         AND usado_en IS NULL`,
      [currentUser.id]
    );

    const challenge = crypto.randomBytes(32).toString('hex');

    const challengeHash = crypto
      .createHash('sha256')
      .update(challenge, 'utf8')
      .digest('hex');

    await connection.execute(
      `INSERT INTO mfa_desafios (
         usuario_id,
         token_hash,
         proposito,
         version_sesion,
         vence_en
       )
       VALUES (
         ?, ?, ?, ?,
         DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 MINUTE)
       )`,
      [
        currentUser.id,
        challengeHash,
        purpose,
        currentUser.version_sesion,
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return {
      challenge,
      purpose,
      expiresIn: CHALLENGE_SECONDS,
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch {
        // Conserva el error original sin exponer datos privados.
      }
    }

    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { createMfaChallenge };