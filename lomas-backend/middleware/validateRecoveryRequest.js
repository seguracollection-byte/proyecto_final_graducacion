const { body, validationResult } = require('express-validator');

const validateRecoveryRequest = [
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

module.exports = { validateRecoveryRequest };