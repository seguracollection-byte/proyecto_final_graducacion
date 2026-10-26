const bcrypt = require('bcryptjs');
const { getLomasPool } = require('../config/lomasDatabase');
const { hashAccountToken } = require('./accountTokenService');

function invalidToken() {
  const error = new Error('Enlace inválido, vencido o utilizado');
  error.code = 'INVALID_ACCOUNT_TOKEN';
  return error;
}

async function resetPassword(token, password) {
  let tokenHash;

  try {
    tokenHash = hashAccountToken(token);
  } catch {
    throw invalidToken();
  }

  if (
    typeof password !== 'string' ||
    Array.from(password).length < 12 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    const error = new Error('Contraseña fuera del tamaño permitido');
    error.code = 'INVALID_PASSWORD';
    throw error;
  }

  const connection = await getLomasPool().getConnection();
  let transactionStarted = false;

  try {
    const [candidates] = await connection.execute(
      `SELECT usuario_id
       FROM tokens_cuenta
       WHERE token_hash = ?
         AND proposito = 'recuperacion'
         AND usado_en IS NULL
         AND vence_en > UTC_TIMESTAMP()
       LIMIT 1`,
      [tokenHash]
    );

    if (!candidates[0]) {
      throw invalidToken();
    }

    const userId = candidates[0].usuario_id;
    const passwordHash = await bcrypt.hash(password, 12);

    await connection.beginTransaction();
    transactionStarted = true;

    // Mantener el mismo orden de bloqueo: cuenta y luego token.
    const [users] = await connection.execute(
      `SELECT id, estado, password_hash
       FROM usuarios
       WHERE id = ?
       FOR UPDATE`,
      [userId]
    );

    if (
      !users[0] ||
      users[0].estado !== 'activo' ||
      !users[0].password_hash
    ) {
      throw invalidToken();
    }

    // Comprobar otra vez dentro de la transacción.
    const [tokens] = await connection.execute(
      `SELECT id
       FROM tokens_cuenta
       WHERE token_hash = ?
         AND usuario_id = ?
         AND proposito = 'recuperacion'
         AND usado_en IS NULL
         AND vence_en > UTC_TIMESTAMP()
       FOR UPDATE`,
      [tokenHash, userId]
    );

    if (!tokens[0]) {
      throw invalidToken();
    }

    await connection.execute(
      `UPDATE usuarios
       SET password_hash = ?,
           version_sesion = version_sesion + 1
       WHERE id = ?`,
      [passwordHash, userId]
    );

    // Invalidar todos los enlaces de recuperación de esta cuenta.
    await connection.execute(
      `UPDATE tokens_cuenta
       SET usado_en = UTC_TIMESTAMP()
       WHERE usuario_id = ?
         AND proposito = 'recuperacion'
         AND usado_en IS NULL`,
      [userId]
    );

    await connection.commit();
    transactionStarted = false;

    return { success: true };
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { resetPassword };