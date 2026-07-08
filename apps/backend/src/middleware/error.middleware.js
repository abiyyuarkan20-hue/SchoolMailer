const { sendError } = require('../utils/response.helper');

const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    console.error('[ERROR]', err);
  }

  const statusCode = err.statusCode || 500;
  let message = err.message || 'Terjadi kesalahan internal server';
  let errors = err.errors || null;

  // Handle Prisma specific errors
  if (err.code === 'P2002') {
    return sendError(res, 'Data sudah ada (duplikat)', 409, isProduction ? undefined : { target: err.meta?.target });
  }

  if (err.code === 'P2025') {
    return sendError(res, 'Data tidak ditemukan', 404);
  }

  // In production, hide internal error details for 500 errors
  if (isProduction && statusCode === 500) {
    message = 'Terjadi kesalahan internal server';
    errors = undefined;
  }

  return sendError(res, message, statusCode, errors);
};

module.exports = {
  errorHandler
};
