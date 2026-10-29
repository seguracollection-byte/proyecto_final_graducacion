const { rateLimit } = require('express-rate-limit');

const mfaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,

  handler(req, res) {
    res.set('Cache-Control', 'no-store');

    return res.status(429).json({
      success: false,
      message:
        'Demasiados intentos de verificación. Esperá 15 minutos antes de volver a intentar.',
    });
  },
});

module.exports = { mfaLimiter };