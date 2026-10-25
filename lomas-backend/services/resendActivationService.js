const { getLomasPool } = require('../config/lomasDatabase');
const {
  createAccountToken,
} = require('./accountTokenService');

function conflict() {
  const error = new Error('La cuenta no admite reenvío');
  error.code = 'ACTIVATION_CONFLICT';
  return error;
}

async function renewActivationToken(requestId, adminId) {
  const connection = await getLomasPool().getConnection();

  try {
    await connection.beginTransaction();

    const [admins] = await connection.execute(
      `SELECT id
       FROM usuarios
       WHERE id = ?
         AND rol = 'administrador'
         AND estado = 'activo'
       FOR UPDATE`,
      [adminId]
    );

    if (admins.length === 0) {
      const error = new Error('Administrador no disponible');
      error.code = 'ADMIN_NOT_ACTIVE';
      throw error;
    }

    const [requests] = await connection.execute(
      `SELECT usuario_id
       FROM solicitudes_acceso
       WHERE id = ?
         AND estado = 'aprobada'
       FOR UPDATE`,
      [requestId]
    );

    if (!requests[0] || !requests[0].usuario_id) {
      throw conflict();
    }

    const userId = requests[0].usuario_id;

    const [users] = await connection.execute(
      `SELECT id, email, estado
       FROM usuarios
       WHERE id = ?
       FOR UPDATE`,
      [userId]
    );

    const user = users[0];

    if (!user || user.estado !== 'pendiente_activacion') {
      throw conflict();
    }

    await connection.execute(
      `UPDATE tokens_cuenta
       SET usado_en = UTC_TIMESTAMP()
       WHERE usuario_id = ?
         AND proposito = 'activacion'
         AND usado_en IS NULL`,
      [userId]
    );

    const accountToken = createAccountToken();

    await connection.execute(
      `INSERT INTO tokens_cuenta
         (usuario_id, token_hash, proposito, vence_en)
       VALUES (
         ?, ?, 'activacion',
         DATE_ADD(UTC_TIMESTAMP(), INTERVAL 24 HOUR)
       )`,
      [userId, accountToken.tokenHash]
    );

    await connection.commit();

    return {
      userId,
      email: user.email,
      activationToken: accountToken.token,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { renewActivationToken };