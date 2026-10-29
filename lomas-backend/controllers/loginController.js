const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');

const { getLomasPool } = require('../config/lomasDatabase');

const {
  createMfaChallenge,
} = require('../services/mfaChallengeService');

// Permite comparar incluso cuando la cuenta no existe,
// reduciendo diferencias evidentes de tiempo entre respuestas.
const dummyHash = bcrypt.hashSync(
  crypto.randomBytes(32).toString('hex'),
  12
);

async function login(req, res) {
  res.set('Cache-Control', 'no-store');

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

    const matches = await bcrypt.compare(
      password,
      hash
    );

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

    const pendingMfa = await createMfaChallenge(user);

    // Todavía no se entrega un token de sesión.
    return res.status(202).json({
      success: true,
      mfaRequired: true,
      challenge: pendingMfa.challenge,
      nextStep: pendingMfa.purpose,
      expiresIn: pendingMfa.expiresIn,
      message:
        pendingMfa.purpose === 'configuracion'
          ? 'Configurá Authenticator para completar tu ingreso.'
          : 'Ingresá el código de Authenticator para completar tu ingreso.',
    });
  } catch {
    console.error('No se pudo procesar el inicio de sesión.');

    return res.status(503).json({
      success: false,
      message:
        'No se pudo iniciar sesión. Intentá más tarde.',
    });
  }
}

module.exports = { login };