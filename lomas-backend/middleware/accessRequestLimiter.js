const { rateLimit } = require('express-rate-limit');

const accessRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Demasiados intentos. Esperá 15 minutos antes de volver a solicitar acceso.',
  },
});

module.exports = { accessRequestLimiter };