const express = require('express');
const { rateLimit } = require('express-rate-limit');

const { requireAuth } = require('../middleware/requireAuth');
const { requireAdmin } = require('../middleware/requireAdmin');
const {
  validateRequestId,
} = require('../middleware/validateRequestId');

const {
  listPendingRequests,
  rejectAccessRequest,
} = require('../controllers/adminAccessController');
const { approve } = require('../controllers/approvalController');
const {
  resendActivation,
} = require('../controllers/resendActivationController');

const router = express.Router();

router.use(requireAuth, requireAdmin);

const activationEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => String(req.user.id),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Demasiados intentos de envío. Esperá el tiempo indicado en Retry-After.',
  },
});

router.get('/solicitudes', listPendingRequests);

router.post(
  '/solicitudes/:id/rechazar',
  validateRequestId,
  rejectAccessRequest
);

router.post(
  '/solicitudes/:id/aprobar',
  activationEmailLimiter,
  validateRequestId,
  approve
);

router.post(
  '/solicitudes/:id/reenviar-activacion',
  activationEmailLimiter,
  validateRequestId,
  resendActivation
);

module.exports = router;