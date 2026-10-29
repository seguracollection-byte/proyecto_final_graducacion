const express = require('express');

const {
  beginDeviceRegistration,
  finishDeviceRegistration,
  beginBiometricLogin,
  finishBiometricLogin,
} = require('../controllers/biometricController');

const { requireAuth } = require('../middleware/requireAuth');
const { mfaLimiter } = require('../middleware/mfaLimiter');

const router = express.Router();

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.use(mfaLimiter);

// Vincular un teléfono exige una sesión que ya completó MFA.
router.post(
  '/dispositivos/registrar',
  requireAuth,
  beginDeviceRegistration
);

router.post(
  '/dispositivos/confirmar',
  requireAuth,
  finishDeviceRegistration
);

// Estas rutas validan el permiso temporal del login.
// Todavía no existe una sesión completa.
router.post(
  '/ingreso/desafio',
  beginBiometricLogin
);

router.post(
  '/ingreso/verificar',
  finishBiometricLogin
);

module.exports = router;