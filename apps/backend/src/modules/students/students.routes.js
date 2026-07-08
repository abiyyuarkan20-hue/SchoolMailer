const express = require('express');
const multer = require('multer');
const studentController = require('./students.controller');
const { validate } = require('../../middleware/validate.middleware');
const { studentSchema } = require('./students.schema');
const { auth } = require('../../middleware/auth.middleware');

const router = express.Router();

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.use(auth);

router.post('/', validate(studentSchema), studentController.create);
router.get('/', studentController.getAll);
router.get('/classes', studentController.getAllClasses);
router.get('/:id', studentController.getById);
router.put('/:id', validate(studentSchema.partial()), studentController.update);
router.delete('/:id', studentController.remove);

router.post('/import', upload.single('file'), studentController.importBulk);

// DELETE ALL - Dangerous operation, requires confirmation
router.delete('/all/delete-all', studentController.deleteAll);

// Custom Data endpoints
router.patch('/:id/custom-data', studentController.updateCustomData);
router.get('/:id/custom-data', studentController.getCustomData);
router.delete('/:id/custom-data', studentController.deleteCustomData);

// Bulk import custom data
router.post('/custom-data/import', upload.single('file'), studentController.importCustomData);

// Export student data with custom fields
router.get('/custom-data/export', studentController.exportStudentData);

module.exports = router;
