const { verifyRecoveryCode } = require('../services/verifyRecoveryCodeService');
const { setupTotp } = require('../services/setupTotpService');
const { verifyTotp } = require('../services/verifyTotpService');
const { createAccessToken } = require('../services/tokenService');

function handleMfaError(error, res) {
  if (error.code === 'MFA_CHALLENGE_INVALID') {
    return res.status(401).json({
      success: false,
      message:
        'La verificación venció o ya no está disponible. Iniciá sesión nuevamente.',
    });
  }

  if (error.code === 'MFA_RECOVERY_INVALID') {
    return res.status(400).json({ success: false, message: 'Código de recuperación incorrecto o ya utilizado.' });
  }

  if (error.code === 'MFA_CODE_INVALID') {
    return res.status(400).json({
      success: false,
      message:
        'Código incorrecto o ya utilizado. Revisá Authenticator.',
    });
  }

  console.error('No se pudo completar la operación de MFA.');

  return res.status(503).json({
    success: false,
    message:
      'No se pudo completar la verificación. Intentá iniciar sesión nuevamente.',
  });
}

async function setupAuthenticator(req, res) {
  res.set('Cache-Control', 'no-store');

  try {
    const result = await setupTotp(req.body?.challenge);

    return res.status(200).json({
      success: true,
      secret: result.secret,
      uri: result.uri,
      message:
        'Agregá esta cuenta a Authenticator y confirmá con el código de seis dígitos.',
    });
  } catch (error) {
    return handleMfaError(error, res);
  }
}

async function verifyAuthenticator(req, res) {
  res.set('Cache-Control', 'no-store');

  try {
    const result = await verifyTotp({
      challenge: req.body?.challenge,
      code: req.body?.code,
    });

    // La sesión se emite después de verificar el segundo factor.
    const token = createAccessToken(result.user);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: result.user.id,
        nombre: result.user.nombre,
        email: result.user.email,
        rol: result.user.rol,
      },
      recoveryCodes: result.recoveryCodes,
    });
  } catch (error) {
    return handleMfaError(error, res);
  }
}

async function verifyRecovery(req, res) {
  res.set('Cache-Control', 'no-store');
  try {
    const result = await verifyRecoveryCode({ challenge: req.body?.challenge, code: req.body?.code });
    const token = createAccessToken(result.user, 'recovery');
    const { id, nombre, email, rol } = result.user;
    return res.status(200).json({ success: true, token, user: { id, nombre, email, rol }, recoveryCodes: [] });
  } catch (error) {
    return handleMfaError(error, res);
  }
}

module.exports = {
  verifyRecovery,
  setupAuthenticator,
  verifyAuthenticator,
};