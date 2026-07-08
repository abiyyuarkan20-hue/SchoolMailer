const express = require('express');
const multer = require('multer');
const teacherController = require('./teachers.controller');
const { validate } = require('../../middleware/validate.middleware');
const { teacherSchema } = require('./teachers.schema');
const { auth } = require('../../middleware/auth.middleware');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(auth);

router.post('/', validate(teacherSchema), teacherController.create);
router.get('/', teacherController.getAll);
router.get('/:id', teacherController.getById);
router.put('/:id', validate(teacherSchema.partial()), teacherController.update);
router.delete('/:id', teacherController.remove);

router.post('/import', upload.single('file'), teacherController.importBulk);

router.delete('/all/delete-all', teacherController.deleteAll);

module.exports = router;
