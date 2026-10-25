const {
  approveAccessRequest,
} = require('../services/approveAccessService');
const {
  sendActivationEmail,
} = require('../services/activationEmailService');
const { loadEmailConfig } = require('../config/email');
const { buildActivationLink } = require('../config/accountLinks');

async function approve(req, res) {
  res.set('Cache-Control', 'no-store');

  // Revisar configuración antes de crear la cuenta.
  try {
    const emailConfig = loadEmailConfig();

    if (!emailConfig.enabled) {
      return res.status(503).json({
        success: false,
        message:
          'El envío de activaciones está deshabilitado. No se aprobó la solicitud.',
      });
    }

    // Solo comprueba la configuración de la dirección.
    buildActivationLink('0'.repeat(64));
  } catch {
    return res.status(503).json({
      success: false,
      message:
        'Revisar la configuración de activación antes de aprobar.',
    });
  }

  let account;

  try {
    account = await approveAccessRequest(
      req.params.id,
      req.user.id
    );
  } catch (error) {
    if (error.code === 'ADMIN_NOT_ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'No tenés permiso para aprobar solicitudes.',
      });
    }

    if (error.code === 'APPROVAL_CONFLICT') {
      return res.status(409).json({
        success: false,
        message:
          'No se pudo aprobar. La solicitud ya fue revisada o existe una cuenta con ese correo.',
      });
    }

    console.error('No se pudo completar la aprobación.');

    return res.status(503).json({
      success: false,
      message:
        'No se pudo confirmar la aprobación. Actualizá el listado antes de reintentar.',
    });
  }

  try {
    await sendActivationEmail(
      account.email,
      account.activationToken
    );

    return res.status(200).json({
      success: true,
      aprobada: true,
      correoAceptado: true,
      message:
        'Solicitud aprobada. El servidor de correo aceptó la activación.',
    });
  } catch {
    console.error(
      'La cuenta quedó pendiente de activación; el envío no pudo confirmarse.'
    );

    return res.status(202).json({
      success: true,
      aprobada: true,
      correoAceptado: false,
      message:
        'Solicitud aprobada, pero no se pudo confirmar el envío. La cuenta sigue pendiente de activación y requiere un reenvío.',
    });
  }
}

module.exports = { approve };