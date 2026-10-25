const {
  renewActivationToken,
} = require('../services/resendActivationService');
const {
  sendActivationEmail,
} = require('../services/activationEmailService');
const { loadEmailConfig } = require('../config/email');
const { buildActivationLink } = require('../config/accountLinks');

async function resendActivation(req, res) {
  res.set('Cache-Control', 'no-store');

  try {
    const config = loadEmailConfig();

    if (!config.enabled) {
      return res.status(503).json({
        success: false,
        message:
          'El envío está deshabilitado. No se renovó el enlace.',
      });
    }

    buildActivationLink('0'.repeat(64));
  } catch {
    return res.status(503).json({
      success: false,
      message: 'Revisar la configuración de activación.',
    });
  }

  let account;

  try {
    account = await renewActivationToken(
      req.params.id,
      req.user.id
    );
  } catch (error) {
    if (error.code === 'ADMIN_NOT_ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'No tenés permiso para reenviar activaciones.',
      });
    }

    if (error.code === 'ACTIVATION_CONFLICT') {
      return res.status(409).json({
        success: false,
        message:
          'La solicitud no está aprobada o la cuenta ya no está pendiente de activación.',
      });
    }

    console.error('No se pudo confirmar la renovación del enlace.');

    return res.status(503).json({
      success: false,
      message:
        'No se pudo confirmar la renovación. Revisá el estado antes de reintentar.',
    });
  }

  try {
    await sendActivationEmail(
      account.email,
      account.activationToken
    );

    return res.status(200).json({
      success: true,
      enlaceRenovado: true,
      correoAceptado: true,
      message:
        'Enlace renovado. El servidor de correo aceptó el envío. Los enlaces anteriores ya no sirven.',
    });
  } catch {
    console.error('No se pudo confirmar el correo de reactivación.');

    return res.status(202).json({
      success: true,
      enlaceRenovado: true,
      correoAceptado: false,
      message:
        'El enlace fue renovado, pero no se pudo confirmar el envío. Los enlaces anteriores ya no sirven; será necesario reintentar el reenvío.',
    });
  }
}

module.exports = { resendActivation };