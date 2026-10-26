const { rateLimit } = require('express-rate-limit');

const recoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Demasiadas solicitudes de recuperación. Intentá cuando termine el tiempo indicado en Retry-After.',
  },
});

module.exports = { recoveryLimiter };