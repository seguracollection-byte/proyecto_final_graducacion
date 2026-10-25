const { getLomasPool } = require('../config/lomasDatabase');
const {
  createAccountToken,
} = require('./accountTokenService');

function conflict(message) {
  const error = new Error(message);
  error.code = 'APPROVAL_CONFLICT';
  return error;
}

async function approveAccessRequest(requestId, adminId) {
  const connection = await getLomasPool().getConnection();

  try {
    await connection.beginTransaction();

    // Comprueba nuevamente el permiso dentro de la operación.
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

    // Bloquea esta solicitud mientras se toma la decisión.
    const [requests] = await connection.execute(
      `SELECT id, nombre, email, estado
       FROM solicitudes_acceso
       WHERE id = ?
       FOR UPDATE`,
      [requestId]
    );

    const request = requests[0];

    if (!request || request.estado !== 'pendiente') {
      throw conflict('La solicitud no existe o ya fue revisada');
    }

    const [users] = await connection.execute(
      'SELECT id FROM usuarios WHERE email = ? LIMIT 1',
      [request.email]
    );

    if (users.length > 0) {
      throw conflict('Ya existe una cuenta con ese correo');
    }

    const [created] = await connection.execute(
      `INSERT INTO usuarios
         (nombre, email, rol, estado)
       VALUES (?, ?, 'usuario', 'pendiente_activacion')`,
      [request.nombre, request.email]
    );

    const accountToken = createAccountToken();

    await connection.execute(
      `INSERT INTO tokens_cuenta
         (usuario_id, token_hash, proposito, vence_en)
       VALUES (
         ?, ?, 'activacion',
         DATE_ADD(UTC_TIMESTAMP(), INTERVAL 24 HOUR)
       )`,
      [created.insertId, accountToken.tokenHash]
    );

    await connection.execute(
      `UPDATE solicitudes_acceso
       SET estado = 'aprobada',
           revisada_por = ?,
           revisada_en = UTC_TIMESTAMP(),
           usuario_id = ?
       WHERE id = ?`,
      [adminId, created.insertId, requestId]
    );

    await connection.commit();

    // Resultado interno para preparar el correo.
    // No devolver activationToken en respuestas HTTP ni logs.
    return {
      userId: created.insertId,
      email: request.email,
      activationToken: accountToken.token,
    };
  } catch (error) {
    await connection.rollback();

    if (error.code === 'ER_DUP_ENTRY') {
      throw conflict('La cuenta o el token ya existen');
    }

    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { approveAccessRequest };