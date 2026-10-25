const { param, validationResult } = require('express-validator');

const validateRequestId = [
  param('id')
    .matches(/^[1-9]\d*$/)
    .withMessage('El ID de la solicitud debe ser un entero positivo.')
    .bail()
    .isInt({ min: 1, max: 4294967295 })
    .withMessage('El ID de la solicitud está fuera del rango permitido.')
    .toInt(),

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

module.exports = { validateRequestId };