const { resetPassword } = require('../services/resetPasswordService');

async function reset(req, res) {
  res.set('Cache-Control', 'no-store');

  try {
    await resetPassword(
      req.body.token,
      req.body.password
    );

    return res.status(200).json({
      success: true,
      message:
        'Tu contraseña fue actualizada. Iniciá sesión con la contraseña nueva.',
    });
  } catch (error) {
    if (error.code === 'INVALID_ACCOUNT_TOKEN') {
      return res.status(400).json({
        success: false,
        message:
          'El enlace es inválido, venció o ya fue utilizado. Solicitá uno nuevo.',
      });
    }

    if (error.code === 'INVALID_PASSWORD') {
      return res.status(400).json({
        success: false,
        message:
          'Usá como mínimo 12 caracteres sin superar el tamaño permitido.',
      });
    }

    console.error('No se pudo confirmar el cambio de contraseña.');

    return res.status(503).json({
      success: false,
      message:
        'No se pudo confirmar el cambio. Intentá iniciar sesión con la contraseña nueva antes de solicitar otro enlace.',
    });
  }
}

module.exports = { reset };