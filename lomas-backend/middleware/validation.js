const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
};

const validateRegister = [
    body('nombre').trim().notEmpty().withMessage('El nombre es requerido'),
    body('email').trim().isEmail().withMessage('Debe ser un correo electrónico válido'),
    body('telefono').trim().notEmpty().withMessage('El teléfono es requerido'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    handleValidationErrors
];

const validateLogin = [
    body('email').trim().isEmail().withMessage('Debe ser un correo electrónico válido'),
    body('password').notEmpty().withMessage('La contraseña es requerida'),
    handleValidationErrors
];

module.exports = {
    validateRegister,
    validateLogin
}