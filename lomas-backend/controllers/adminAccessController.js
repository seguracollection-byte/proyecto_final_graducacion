const { getLomasPool } = require('../config/lomasDatabase');

async function listPendingRequests(req, res) {
  try {
    const [rows] = await getLomasPool().execute(
      `SELECT id, nombre, email, estado, creado_en
       FROM solicitudes_acceso
       WHERE estado = 'pendiente'
       ORDER BY creado_en ASC, id ASC
       LIMIT 100`
    );

    res.set('Cache-Control', 'no-store');

    return res.status(200).json({
      success: true,
      solicitudes: rows,
    });
  } catch {
    console.error('No se pudieron consultar las solicitudes.');

    return res.status(503).json({
      success: false,
      message: 'No se pudieron cargar las solicitudes. Intentá más tarde.',
    });
  }
}
async function rejectAccessRequest(req, res) {
  try {
    const pool = getLomasPool();

    const [result] = await pool.execute(
      `UPDATE solicitudes_acceso
       SET estado = 'rechazada',
           revisada_por = ?,
           revisada_en = UTC_TIMESTAMP()
       WHERE id = ?
         AND estado = 'pendiente'`,
      [req.user.id, req.params.id]
    );

    res.set('Cache-Control', 'no-store');

    if (result.affectedRows === 0) {
      return res.status(409).json({
        success: false,
        message:
          'La solicitud no existe o ya fue revisada. Actualizá el listado.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Solicitud rechazada.',
    });
  } catch {
    console.error('No se pudo rechazar la solicitud.');

    return res.status(503).json({
      success: false,
      message: 'No se pudo procesar el rechazo. Intentá más tarde.',
    });
  }
}
module.exports = {
  listPendingRequests,
  rejectAccessRequest,
};