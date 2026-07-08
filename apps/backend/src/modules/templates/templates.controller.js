const templateService = require('./templates.service');
const { importDocument } = require('./import.service');
const { sendSuccess } = require('../../utils/response.helper');

const create = async (req, res, next) => {
  try {
    const template = await templateService.createTemplate(req.validatedData, req.user.userId);
    return sendSuccess(res, template, 'Template berhasil dibuat', 201);
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { search, type } = req.query;
    const templates = await templateService.getAllTemplates({ search, letterType: type });
    return sendSuccess(res, templates, 'Data template berhasil diambil');
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const template = await templateService.getTemplateById(req.params.id);
    return sendSuccess(res, template, 'Detail template berhasil diambil');
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const template = await templateService.updateTemplate(req.params.id, req.validatedData);
    return sendSuccess(res, template, 'Template berhasil diperbarui');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await templateService.deleteTemplate(req.params.id);
    return sendSuccess(res, null, 'Template berhasil dihapus');
  } catch (error) {
    next(error);
  }
};

const importDoc = async (req, res, next) => {
  try {
    if (!req.file) throw new Error('File tidak ditemukan');
    const result = await importDocument(req.file);
    return sendSuccess(res, result, 'File berhasil diimport');
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
  importDoc,
};
