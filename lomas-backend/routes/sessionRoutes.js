const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

router.get('/me', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');

  return res.json({
    success: true,
    user: req.user,
  });
});

module.exports = router;