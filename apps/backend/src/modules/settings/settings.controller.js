const settingsService = require('./settings.service');
const { sendSuccess } = require('../../utils/response.helper');

const getSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getSettings();
    return sendSuccess(res, settings, 'Pengaturan berhasil diambil');
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.updateSettings(req.body);
    return sendSuccess(res, settings, 'Pengaturan berhasil disimpan');
  } catch (error) {
    next(error);
  }
};

const getCustomVariables = async (req, res, next) => {
  try {
    const customVariables = await settingsService.getCustomVariables();
    return sendSuccess(res, { customVariables }, 'Custom variables berhasil diambil');
  } catch (error) {
    next(error);
  }
};

const updateCustomVariables = async (req, res, next) => {
  try {
    const { customVariables } = req.body;

    // Validate input
    if (!Array.isArray(customVariables)) {
      const error = new Error('customVariables harus berupa array');
      error.statusCode = 400;
      throw error;
    }

    // Validate each item is a string
    if (!customVariables.every(item => typeof item === 'string')) {
      const error = new Error('Setiap item dalam customVariables harus berupa string');
      error.statusCode = 400;
      throw error;
    }

    const settings = await settingsService.updateCustomVariables(customVariables);
    return sendSuccess(res, { customVariables: settings.customVariables }, 'Daftar variabel custom berhasil diperbarui');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getCustomVariables,
  updateCustomVariables
};
