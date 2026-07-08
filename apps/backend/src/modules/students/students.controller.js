const studentService = require('./students.service');
const customDataService = require('./customData.service');
const bulkImportService = require('./bulkImport.service');
const exportService = require('./export.service');
const { sendSuccess } = require('../../utils/response.helper');
const { audit } = require('../audit/audit.service');
const { extractClientInfo } = require('../../middleware/security.middleware');

const create = async (req, res, next) => {
  try {
    const student = await studentService.createStudent(req.validatedData);
    return sendSuccess(res, student, 'Data siswa berhasil ditambahkan', 201);
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { search, grade, className, page, limit } = req.query;
    const result = await studentService.getAllStudents(
      { search, grade, className },
      { page, limit }
    );
    return sendSuccess(res, result.data, 'Data siswa berhasil diambil', 200, result.meta);
  } catch (error) {
    next(error);
  }
};

const getAllClasses = async (req, res, next) => {
  try {
    const classes = await studentService.getAllClasses();
    return sendSuccess(res, classes, 'Daftar kelas berhasil diambil');
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const student = await studentService.getStudentById(req.params.id);
    return sendSuccess(res, student, 'Detail siswa berhasil diambil');
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const student = await studentService.updateStudent(req.params.id, req.validatedData);
    return sendSuccess(res, student, 'Data siswa berhasil diperbarui');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await studentService.deleteStudent(req.params.id);
    return sendSuccess(res, null, 'Data siswa berhasil dihapus');
  } catch (error) {
    next(error);
  }
};

const importBulk = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error('File tidak ditemukan');
      error.statusCode = 400;
      throw error;
    }

    const result = await studentService.importStudents(req.file.buffer, req.file.mimetype, req.file.originalname);
    const { ip } = extractClientInfo(req);
    audit.importStudents(req.user?.userId, { imported: result.importedCount, skipped: result.skippedCount }, ip);
    return sendSuccess(res, result, `Berhasil mengimpor ${result.importedCount} data siswa.`);
  } catch (error) {
    next(error);
  }
};

const deleteAll = async (req, res, next) => {
  try {
    const { ip } = extractClientInfo(req);
    const result = await studentService.deleteAllStudents();
    audit.deleteAllStudents(req.user?.userId, result.deletedCount || 0, ip);
    return sendSuccess(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

// Custom Data Controller Methods

const updateCustomData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customData = req.body;

    const updatedStudent = await customDataService.updateCustomData(id, customData);
    return sendSuccess(res, updatedStudent, 'Data custom berhasil diperbarui');
  } catch (error) {
    next(error);
  }
};

const getCustomData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customData = await customDataService.getCustomData(id);
    return sendSuccess(res, customData, 'Data custom berhasil diambil');
  } catch (error) {
    next(error);
  }
};

const deleteCustomData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { keys } = req.body;

    if (!keys || !Array.isArray(keys)) {
      const error = new Error('Keys harus berupa array');
      error.statusCode = 400;
      throw error;
    }

    const updatedStudent = await customDataService.deleteCustomDataKeys(id, keys);
    return sendSuccess(res, updatedStudent, 'Data custom berhasil dihapus');
  } catch (error) {
    next(error);
  }
};

const importCustomData = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error('File tidak ditemukan');
      error.statusCode = 400;
      throw error;
    }

    const result = await bulkImportService.importCustomData(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    const message = `Import selesai: ${result.importedCount} berhasil, ${result.skippedCount} gagal`;
    return sendSuccess(res, result, message);
  } catch (error) {
    next(error);
  }
};

const exportStudentData = async (req, res, next) => {
  try {
    const { format = 'xlsx', grade, className, search } = req.query;
    
    // Validate format
    if (!['csv', 'xlsx'].includes(format)) {
      const error = new Error('Format tidak valid. Gunakan csv atau xlsx');
      error.statusCode = 400;
      throw error;
    }

    const filters = { grade, className, search };
    const buffer = await exportService.exportStudentData(filters, format);
    const filename = exportService.getExportFilename(format);

    // Set appropriate headers
    const mimeTypes = {
      csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    res.setHeader('Content-Type', mimeTypes[format]);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  getAll,
  getAllClasses,
  getById,
  update,
  remove,
  importBulk,
  deleteAll,
  updateCustomData,
  getCustomData,
  deleteCustomData,
  importCustomData,
  exportStudentData
};
