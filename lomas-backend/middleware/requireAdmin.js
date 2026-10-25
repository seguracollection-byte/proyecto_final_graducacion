function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Debés iniciar sesión.',
    });
  }

  if (req.user.rol !== 'administrador') {
    return res.status(403).json({
      success: false,
      message: 'Esta operación requiere permisos de administrador.',
    });
  }

  return next();
}

module.exports = { requireAdmin };