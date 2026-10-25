const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const { requireAdmin } = require('../middleware/requireAdmin');
const {
  validateRequestId,
} = require('../middleware/validateRequestId');
const {
  listPendingRequests,
  rejectAccessRequest,
} = require('../controllers/adminAccessController');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/solicitudes', listPendingRequests);

router.post(
  '/solicitudes/:id/rechazar',
  validateRequestId,
  rejectAccessRequest
);

module.exports = router;