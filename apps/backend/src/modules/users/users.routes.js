const express = require('express');
const router = express.Router();
const usersController = require('./users.controller');
const { auth } = require('../../middleware/auth.middleware');

router.use(auth);

router.put('/password', usersController.changePassword);

module.exports = router;
