const { getLomasPool } = require('../config/lomasDatabase');

async function listPendingActivations(_req, res) {
  res.set('Cache-Control', 'no-store');

  try {
    const [rows] = await getLomasPool().execute(
      `SELECT
         s.id,
         u.nombre,
         u.email,
         s.estado,
         u.estado AS cuenta_estado,
         s.revisada_en
       FROM solicitudes_acceso AS s
       INNER JOIN usuarios AS u
         ON u.id = s.usuario_id
       WHERE s.estado = 'aprobada'
         AND u.estado = 'pendiente_activacion'
       ORDER BY s.revisada_en ASC, s.id ASC
       LIMIT 100`
    );

    return res.status(200).json({
      success: true,
      solicitudes: rows,
    });
  } catch {
    console.error(
      'No se pudieron consultar las activaciones pendientes.'
    );

    return res.status(503).json({
      success: false,
      message:
        'No se pudieron cargar las activaciones pendientes. Intentá más tarde.',
    });
  }
}

module.exports = { listPendingActivations };