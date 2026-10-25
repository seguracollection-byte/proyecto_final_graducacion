const express = require('express');
const {
  accessRequestLimiter,
} = require('../middleware/accessRequestLimiter');
const {
  validateAccessRequest,
} = require('../middleware/validateAccessRequest');
const {
  createAccessRequest,
} = require('../controllers/accessRequestController');

const router = express.Router();

router.post(
  '/',
  accessRequestLimiter,
  validateAccessRequest,
  createAccessRequest
);

module.exports = router;