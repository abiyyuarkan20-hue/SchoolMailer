/**
 * Standarisasi JSON response sukses
 */
const sendSuccess = (res, data = {}, message = 'Berhasil', statusCode = 200, meta = undefined) => {
  const response = {
    success: true,
    message,
    data
  };
  
  if (meta) {
    response.meta = meta;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Standarisasi JSON response error
 */
const sendError = (res, message = 'Terjadi kesalahan internal', statusCode = 500, errors = undefined) => {
  const response = {
    success: false,
    message
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  sendSuccess,
  sendError
};
