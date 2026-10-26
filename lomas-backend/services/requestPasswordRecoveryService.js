const { getLomasPool } = require('../config/lomasDatabase');
const { createAccountToken } = require('./accountTokenService');

async function requestPasswordRecovery(email) {
  if (
    typeof email !== 'string' ||
    email.trim().length === 0 ||
    email.trim().length > 254
  ) {
    const error = new Error('Correo inválido');
    error.code = 'INVALID_EMAIL';
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const connection = await getLomasPool().getConnection();

  try {
    await connection.beginTransaction();

    const [users] = await connection.execute(
      `SELECT id, email, estado, password_hash
       FROM usuarios
       WHERE email = ?
       FOR UPDATE`,
      [normalizedEmail]
    );

    const user = users[0];

    // Solo las cuentas activas con contraseña pueden recuperarla.
    if (
      !user ||
      user.estado !== 'activo' ||
      !user.password_hash
    ) {
      await connection.commit();
      return null;
    }

    // Un nuevo enlace invalida los enlaces de recuperación anteriores.
    await connection.execute(
      `UPDATE tokens_cuenta
       SET usado_en = UTC_TIMESTAMP()
       WHERE usuario_id = ?
         AND proposito = 'recuperacion'
         AND usado_en IS NULL`,
      [user.id]
    );

    const accountToken = createAccountToken();

    await connection.execute(
      `INSERT INTO tokens_cuenta
         (usuario_id, token_hash, proposito, vence_en)
       VALUES (
         ?, ?, 'recuperacion',
         DATE_ADD(UTC_TIMESTAMP(), INTERVAL 15 MINUTE)
       )`,
      [user.id, accountToken.tokenHash]
    );

    await connection.commit();

    // Uso interno para enviar el correo.
    // El controlador no debe devolver este token al navegador.
    return {
      userId: user.id,
      email: user.email,
      recoveryToken: accountToken.token,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { requestPasswordRecovery };