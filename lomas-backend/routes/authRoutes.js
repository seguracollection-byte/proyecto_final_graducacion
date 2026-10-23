// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rutas de registro y login tradicionales
router.post('/register', authController.register);
router.post('/login', authController.login);

// Ruta para solicitar la contraseña temporal por correo
router.post('/recuperar', authController.recuperarPassword);

// 🔑 NUEVA RUTA: Permite al usuario actualizar su contraseña desde el perfil
router.put('/update-password', authController.updatePassword);

module.exports = router;