const express = require('express');
const {
  recoveryLimiter,
} = require('../middleware/recoveryLimiter');
const {
  validateRecoveryRequest,
} = require('../middleware/validateRecoveryRequest');
const {
  requestRecovery,
} = require('../controllers/requestPasswordRecoveryController');

const router = express.Router();

router.post(
  '/',
  recoveryLimiter,
  validateRecoveryRequest,
  requestRecovery
);

module.exports = router;