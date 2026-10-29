const express = require('express');

const {
  verifyRecovery,
  setupAuthenticator,
  verifyAuthenticator,
} = require('../controllers/mfaController');

const { mfaLimiter } = require('../middleware/mfaLimiter');

const router = express.Router();

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.use(mfaLimiter);

router.post('/configurar', setupAuthenticator);

router.post('/verificar', verifyAuthenticator);
router.post('/recuperacion', verifyRecovery);

module.exports = router;