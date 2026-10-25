const { rateLimit } = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Demasiados intentos de inicio de sesión. Intentá cuando termine el tiempo indicado en Retry-After.',
  },
});

module.exports = { loginLimiter };