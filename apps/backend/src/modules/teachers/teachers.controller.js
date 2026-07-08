const teacherService = require('./teachers.service');
const { sendSuccess } = require('../../utils/response.helper');
const { audit } = require('../audit/audit.service');
const { extractClientInfo } = require('../../middleware/security.middleware');

const create = async (req, res, next) => {
  try {
    const teacher = await teacherService.createTeacher(req.validatedData);
    return sendSuccess(res, teacher, 'Data guru berhasil ditambahkan', 201);
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { search, position, subject, status, page, limit } = req.query;
    const result = await teacherService.getAllTeachers(
      { search, position, subject, status },
      { page, limit }
    );
    return sendSuccess(res, result.data, 'Data guru berhasil diambil', 200, result.meta);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const teacher = await teacherService.getTeacherById(req.params.id);
    return sendSuccess(res, teacher, 'Detail guru berhasil diambil');
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const teacher = await teacherService.updateTeacher(req.params.id, req.validatedData);
    return sendSuccess(res, teacher, 'Data guru berhasil diperbarui');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await teacherService.deleteTeacher(req.params.id);
    return sendSuccess(res, null, 'Data guru berhasil dihapus');
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

    const result = await teacherService.importTeachers(req.file.buffer, req.file.mimetype, req.file.originalname);
    const { ip } = extractClientInfo(req);
    audit.importTeachers(req.user?.userId, { imported: result.importedCount, skipped: result.skippedCount }, ip);
    return sendSuccess(res, result, `Berhasil mengimpor ${result.importedCount} data guru.`);
  } catch (error) {
    next(error);
  }
};

const deleteAll = async (req, res, next) => {
  try {
    const { ip } = extractClientInfo(req);
    const result = await teacherService.deleteAllTeachers();
    audit.deleteAllTeachers(req.user?.userId, result.deletedCount || 0, ip);
    return sendSuccess(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  getAll,
  getById,
  update,
  remove,
  importBulk,
  deleteAll,
};
