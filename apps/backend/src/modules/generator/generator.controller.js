const generatorService = require('./generator.service');
const { sendSuccess } = require('../../utils/response.helper');
const prisma = require('../../config/database');
const fs = require('fs');
const path = require('path');

const generate = async (req, res, next) => {
  try {
    const job = await generatorService.queueGeneration(req.validatedData, req.user.userId);
    return sendSuccess(res, job, 'Proses pembuatan dokumen sedang berjalan di background', 202);
  } catch (error) {
    next(error);
  }
};

const preview = async (req, res, next) => {
  try {
    const { templateId, studentId, customData } = req.body;

    if (!templateId || !studentId) {
      const error = new Error('templateId dan studentId wajib diisi');
      error.statusCode = 400;
      throw error;
    }

    const previewResult = await generatorService.generatePreview(templateId, studentId, customData);
    return sendSuccess(res, previewResult, 'Preview berhasil dibuat');
  } catch (error) {
    next(error);
  }
};

const getAllLogs = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await generatorService.getLogs({ page, limit });
    return sendSuccess(res, result.data, 'Riwayat berhasil diambil', 200, result.meta);
  } catch (error) {
    next(error);
  }
};

const removeLog = async (req, res, next) => {
  try {
    await generatorService.deleteLog(req.params.id);
    return sendSuccess(res, null, 'Riwayat dan file berhasil dihapus');
  } catch (error) {
    next(error);
  }
};

const downloadFile = async (req, res, next) => {
  try {
    const log = await prisma.generationLog.findUnique({
      where: { id: req.params.id },
      include: { template: true }
    });

    if (!log) {
      return res.status(404).json({ success: false, message: 'File tidak ditemukan' });
    }
    
    if (log.status !== 'COMPLETED' || !log.filePath || !fs.existsSync(log.filePath)) {
      return res.status(400).json({ success: false, message: 'File belum siap atau sudah terhapus' });
    }

    await prisma.generationLog.update({
      where: { id: log.id },
      data: { downloadCount: { increment: 1 } }
    });

    const ext = log.outputType === 'ZIP_BUNDLE' ? '.zip' : '.pdf';
    const filename = `${log.template.title.replace(/[^a-z0-9]/gi, '_')}_${new Date(log.createdAt).getTime()}${ext}`;

    res.download(log.filePath, filename);

  } catch (error) {
    next(error);
  }
};

const previewEditor = async (req, res, next) => {
  try {
    const { htmlContent, cssStyles, studentId, customData, pageSize, marginTop, marginRight, marginBottom, marginLeft, teacherId } = req.body;
    if (!htmlContent) {
      const error = new Error('htmlContent wajib diisi');
      error.statusCode = 400;
      throw error;
    }
    const result = await generatorService.previewEditorHtml(htmlContent, cssStyles || '', {
      studentId, customData, pageSize: pageSize || 'A4',
      marginTop, marginRight, marginBottom, marginLeft, teacherId,
    });
    return sendSuccess(res, result, 'Preview berhasil dibuat');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generate,
  preview,
  previewEditor,
  getAllLogs,
  removeLog,
  downloadFile
};
