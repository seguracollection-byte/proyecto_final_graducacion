const express = require('express');
const { loginLimiter } = require('../middleware/loginLimiter');
const { validateLogin } = require('../middleware/validateLogin');
const { login } = require('../controllers/loginController');

const router = express.Router();

router.post('/', loginLimiter, validateLogin, login);

module.exports = router;