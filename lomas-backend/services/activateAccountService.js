const bcrypt = require('bcryptjs');
const { getLomasPool } = require('../config/lomasDatabase');
const {
  hashAccountToken,
} = require('./accountTokenService');

function invalidToken() {
  const error = new Error('Enlace inválido, vencido o utilizado');
  error.code = 'INVALID_ACCOUNT_TOKEN';
  return error;
}

async function activateAccount(token, password) {
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

  try {
    // Primera consulta para identificar la cuenta.
    const [candidates] = await connection.execute(
      `SELECT usuario_id
       FROM tokens_cuenta
       WHERE token_hash = ?
         AND proposito = 'activacion'
       LIMIT 1`,
      [tokenHash]
    );

    if (candidates.length === 0) {
      throw invalidToken();
    }

    const userId = candidates[0].usuario_id;
    const passwordHash = await bcrypt.hash(password, 12);

    await connection.beginTransaction();

    // Bloqueamos primero la cuenta y después el token.
    const [users] = await connection.execute(
      `SELECT id, estado
       FROM usuarios
       WHERE id = ?
       FOR UPDATE`,
      [userId]
    );

    if (
      !users[0] ||
      users[0].estado !== 'pendiente_activacion'
    ) {
      throw invalidToken();
    }

    const [tokens] = await connection.execute(
      `SELECT id
       FROM tokens_cuenta
       WHERE token_hash = ?
         AND usuario_id = ?
         AND proposito = 'activacion'
         AND usado_en IS NULL
         AND vence_en > UTC_TIMESTAMP()
       FOR UPDATE`,
      [tokenHash, userId]
    );

    if (tokens.length === 0) {
      throw invalidToken();
    }

    await connection.execute(
      `UPDATE usuarios
       SET password_hash = ?,
           estado = 'activo',
           version_sesion = version_sesion + 1
       WHERE id = ?`,
      [passwordHash, userId]
    );

    // Invalida todos los enlaces de activación de esta cuenta.
    await connection.execute(
      `UPDATE tokens_cuenta
       SET usado_en = UTC_TIMESTAMP()
       WHERE usuario_id = ?
         AND proposito = 'activacion'
         AND usado_en IS NULL`,
      [userId]
    );

    await connection.commit();

    return { success: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { activateAccount };