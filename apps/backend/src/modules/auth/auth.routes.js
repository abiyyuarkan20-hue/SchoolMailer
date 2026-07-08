const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('./auth.controller');
const { validate } = require('../../middleware/validate.middleware');
const { loginSchema } = require('./auth.schema');
const { auth } = require('../../middleware/auth.middleware');

const router = express.Router();

// Strict rate limiter for login (prevent brute force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.'
  }
});

router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Example protected route for testing
router.get('/me', auth, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
