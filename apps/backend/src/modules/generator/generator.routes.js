const express = require('express');
const generatorController = require('./generator.controller');
const { validate } = require('../../middleware/validate.middleware');
const { generateSchema } = require('./generator.schema');
const { auth } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(auth);

router.post('/', validate(generateSchema), generatorController.generate);
router.post('/preview', generatorController.preview);
router.post('/preview-editor', generatorController.previewEditor);
router.get('/logs', generatorController.getAllLogs);
router.delete('/logs/:id', generatorController.removeLog);
router.get('/download/:id', generatorController.downloadFile);

module.exports = router;
