const express = require('express');
const router = express.Router();
const settingsController = require('./settings.controller');
const { auth } = require('../../middleware/auth.middleware');

router.get('/', auth, settingsController.getSettings);
router.put('/', auth, settingsController.updateSettings);

// Custom Variables endpoints
router.get('/custom-variables', auth, settingsController.getCustomVariables);
router.put('/custom-variables', auth, settingsController.updateCustomVariables);

module.exports = router;
