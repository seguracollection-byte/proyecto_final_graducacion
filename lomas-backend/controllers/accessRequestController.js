const { getLomasPool } = require('../config/lomasDatabase');

const RESPONSE_MESSAGE =
  'Solicitud recibida. Si corresponde, un administrador revisará tu acceso.';

async function createAccessRequest(req, res) {
  // Solo tomamos los campos permitidos.
  // Ignoramos cualquier rol, estado o permiso enviado por el cliente.
  const { nombre, email } = req.body;

  try {
    const pool = getLomasPool();

    await pool.execute(
      `INSERT INTO solicitudes_acceso (nombre, email)
       VALUES (?, ?)`,
      [nombre, email]
    );

    return res.status(202).json({
      success: true,
      message: RESPONSE_MESSAGE,
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      // No modifica una solicitud existente ni revela su estado.
      return res.status(202).json({
        success: true,
        message: RESPONSE_MESSAGE,
      });
    }

    console.error('No se pudo registrar la solicitud de acceso.');

    return res.status(500).json({
      success: false,
      message: 'No se pudo procesar la solicitud. Intentá más tarde.',
    });
  }
}

module.exports = { createAccessRequest };