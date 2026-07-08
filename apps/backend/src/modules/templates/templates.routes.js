const express = require('express');
const multer = require('multer');
const templateController = require('./templates.controller');
const { validate } = require('../../middleware/validate.middleware');
const { createTemplateSchema, updateTemplateSchema } = require('./templates.schema');
const { auth } = require('../../middleware/auth.middleware');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(auth);

router.post('/', validate(createTemplateSchema), templateController.create);
router.get('/', templateController.getAll);
router.post('/import', upload.single('file'), templateController.importDoc);
router.get('/:id', templateController.getById);
router.put('/:id', validate(updateTemplateSchema), templateController.update);
router.delete('/:id', templateController.remove);

module.exports = router;
