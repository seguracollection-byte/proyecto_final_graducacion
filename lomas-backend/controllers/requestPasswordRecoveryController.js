const {
  requestPasswordRecovery,
} = require('../services/requestPasswordRecoveryService');
const {
  sendRecoveryEmail,
} = require('../services/recoveryEmailService');
const { loadEmailConfig } = require('../config/email');
const { buildRecoveryLink } = require('../config/accountLinks');

const publicMessage =
  'Si el correo corresponde a una cuenta activa, recibirás un enlace para restablecer tu contraseña.';

async function requestRecovery(req, res) {
  res.set('Cache-Control', 'no-store');

  // Comprobar la configuración antes de generar un token.
  try {
    const config = loadEmailConfig();

    if (!config.enabled) {
      throw new Error('Correo deshabilitado');
    }

    buildRecoveryLink('0'.repeat(64));
  } catch {
    return res.status(503).json({
      success: false,
      message:
        'La recuperación de contraseña no está disponible en este momento. Intentá más tarde.',
    });
  }

  let account;

  try {
    account = await requestPasswordRecovery(req.body.email);
  } catch {
    console.error('No se pudo procesar la recuperación de contraseña.');

    return res.status(503).json({
      success: false,
      message:
        'No se pudo procesar la solicitud. Intentá más tarde.',
    });
  }

  if (account) {
    try {
      await sendRecoveryEmail(
        account.email,
        account.recoveryToken
      );
    } catch {
      // No revelar al navegador si la cuenta existe.
      // No registrar el correo, el token ni el enlace.
      console.error(
        'No se pudo confirmar el envío del correo de recuperación.'
      );
    }
  }

  return res.status(202).json({
    success: true,
    message: publicMessage,
  });
}

module.exports = { requestRecovery };