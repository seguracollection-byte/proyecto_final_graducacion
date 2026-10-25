const { body, validationResult } = require('express-validator');

const validateAccessRequest = [
  body('nombre')
    .isString()
    .withMessage('El nombre debe ser texto')
    .bail()
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('El nombre debe tener entre 2 y 120 caracteres'),

  body('email')
    .isString()
    .withMessage('El correo debe ser texto')
    .bail()
    .trim()
    .isLength({ max: 254 })
    .withMessage('El correo es demasiado largo')
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

    next();
  },
];

module.exports = { validateAccessRequest };