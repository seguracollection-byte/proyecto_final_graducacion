const {
  activateAccount,
} = require('../services/activateAccountService');

async function activate(req, res) {
  res.set('Cache-Control', 'no-store');

  try {
    await activateAccount(req.body.token, req.body.password);

    return res.status(200).json({
      success: true,
      message: 'Cuenta activada. Ya podés iniciar sesión.',
    });
  } catch (error) {
    if (error.code === 'INVALID_ACCOUNT_TOKEN') {
      return res.status(400).json({
        success: false,
        message: 'El enlace es inválido, venció o ya fue utilizado.',
      });
    }

    if (error.code === 'INVALID_PASSWORD') {
      return res.status(400).json({
        success: false,
        message:
          'Usá al menos 12 caracteres y como máximo 72 bytes.',
      });
    }

    console.error('No se pudo completar la activación.');

    return res.status(503).json({
      success: false,
      message: 'No se pudo activar la cuenta. Intentá más tarde.',
    });
  }
}

module.exports = { activate };