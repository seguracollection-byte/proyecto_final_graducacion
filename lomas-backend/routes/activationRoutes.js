const express = require('express');
const { rateLimit } = require('express-rate-limit');
const {
  validateActivation,
} = require('../middleware/validateActivation');
const { activate } = require('../controllers/activationController');

const router = express.Router();

const activationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Demasiados intentos de activación. Esperá el tiempo indicado en Retry-After.',
  },
});

router.post(
  '/',
  activationLimiter,
  validateActivation,
  activate
);

module.exports = router;