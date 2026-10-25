const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const { getLomasPool } = require('../config/lomasDatabase');
const { createAccessToken } = require('../services/tokenService');

// Permite comparar incluso cuando la cuenta no existe,
// reduciendo diferencias evidentes de tiempo entre respuestas.
const dummyHash = bcrypt.hashSync(
  crypto.randomBytes(32).toString('hex'),
  12
);

async function login(req, res) {
  const { email, password } = req.body;

  try {
    const [rows] = await getLomasPool().execute(
      `SELECT id, nombre, email, password_hash,
              rol, estado, version_sesion
       FROM usuarios
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    const user = rows[0];
    const hash = user?.password_hash || dummyHash;
    const matches = await bcrypt.compare(password, hash);

    if (
      !user ||
      !user.password_hash ||
      !matches ||
      user.estado !== 'activo'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Correo o contraseña incorrectos.',
      });
    }

    const token = createAccessToken(user);

    res.set('Cache-Control', 'no-store');

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      },
    });
  } catch {
    console.error('No se pudo procesar el inicio de sesión.');

    return res.status(503).json({
      success: false,
      message: 'No se pudo iniciar sesión. Intentá más tarde.',
    });
  }
}

module.exports = { login };