const fs = require('fs');
const path = require('path');
const { sendSuccess, sendError } = require('../../utils/response.helper');

const uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, 'File gambar tidak ditemukan', 400);
    }
    
    // Asumsi file diupload dan disimpan oleh multer ke dalam folder public/uploads/logos
    // Return path relatif untuk bisa diakses publik
    const filePath = `/uploads/logos/${req.file.filename}`;
    
    return sendSuccess(res, { url: filePath }, 'Logo berhasil diupload');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadLogo
};
