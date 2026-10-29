const { verifyAccessToken } = require('../services/tokenService');
const { getLomasPool } = require('../config/lomasDatabase');

function unauthorized(res) {
  return res.status(401).json({
    success: false,
    message:
      'Sesión inválida o vencida. Iniciá sesión nuevamente.',
  });
}

async function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = /^Bearer ([^\s]+)$/i.exec(authorization);

  if (!match || match[1].length > 4096) {
    return unauthorized(res);
  }

  let session;

  try {
    session = verifyAccessToken(match[1]);
  } catch {
    return unauthorized(res);
  }

  try {
    const [rows] = await getLomasPool().execute(
      `SELECT id, nombre, email, rol, estado, version_sesion
       FROM usuarios
       WHERE id = ?
       LIMIT 1`,
      [session.userId]
    );

    const user = rows[0];

    if (
      !user ||
      user.estado !== 'activo' ||
      user.version_sesion !== session.sessionVersion
    ) {
      return unauthorized(res);
    }

    req.user = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
    };

    // Datos internos obtenidos del token verificado.
    req.auth = {
      sessionVersion: session.sessionVersion,
    };
  } catch {
    console.error('No se pudo comprobar la sesión.');

    return res.status(503).json({
      success: false,
      message:
        'No se pudo comprobar la sesión. Intentá más tarde.',
    });
  }

  return next();
}

module.exports = { requireAuth };