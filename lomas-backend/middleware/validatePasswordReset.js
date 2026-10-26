const { body, validationResult } = require('express-validator');

const validatePasswordReset = [
  body('token')
    .isString()
    .withMessage('El enlace de recuperación es inválido.')
    .bail()
    .matches(/^[a-f0-9]{64}$/)
    .withMessage('El enlace de recuperación es inválido.'),

  body('password')
    .isString()
    .withMessage('Ingresá una contraseña.')
    .bail()
    .custom((value) => Array.from(value).length >= 12)
    .withMessage('Usá como mínimo 12 caracteres.')
    .bail()
    .custom((value) => Buffer.byteLength(value, 'utf8') <= 72)
    .withMessage('La contraseña supera el tamaño permitido.'),

  body('passwordConfirm')
    .isString()
    .withMessage('Repetí la contraseña.')
    .bail()
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Las contraseñas no coinciden.'),

  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((error) => ({
          campo: error.path,
          mensaje: error.msg,
        })),
      });
    }

    return next();
  },
];

module.exports = { validatePasswordReset };