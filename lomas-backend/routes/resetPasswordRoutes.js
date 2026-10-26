const express = require('express');
const { rateLimit } = require('express-rate-limit');
const {
  validatePasswordReset,
} = require('../middleware/validatePasswordReset');
const {
  reset,
} = require('../controllers/resetPasswordController');

const router = express.Router();

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Demasiados intentos. Esperá el tiempo indicado en Retry-After.',
  },
});

router.post(
  '/',
  resetLimiter,
  validatePasswordReset,
  reset
);

module.exports = router;