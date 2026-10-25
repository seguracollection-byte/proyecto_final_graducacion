const { body, validationResult } = require('express-validator');

const validateLogin = [
  body('email')
    .isString()
    .withMessage('Ingresá un correo válido')
    .bail()
    .trim()
    .isLength({ max: 254 })
    .withMessage('Ingresá un correo válido')
    .bail()
    .isEmail()
    .withMessage('Ingresá un correo válido')
    .bail()
    .customSanitizer((email) => email.toLowerCase()),

  body('password')
    .isString()
    .withMessage('Ingresá la contraseña')
    .bail()
    .notEmpty()
    .withMessage('Ingresá la contraseña')
    .bail()
    .custom((password) => {
      return Buffer.byteLength(password, 'utf8') <= 72;
    })
    .withMessage('La contraseña supera el tamaño permitido'),

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

module.exports = { validateLogin };