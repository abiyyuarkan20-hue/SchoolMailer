const express = require('express');
const router = express.Router();
const dashboardController = require('./dashboard.controller');
const { auth } = require('../../middleware/auth.middleware');

router.use(auth); // Semua route dashboard dilindungi token

router.get('/stats', dashboardController.getDashboardStats);

module.exports = router;
