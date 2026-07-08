const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { sendError } = require('../utils/response.helper');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Token tidak ditemukan atau format salah', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return sendError(res, 'Akun tidak aktif atau tidak ditemukan', 401);
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Token sudah kedaluwarsa', 401);
    }
    return sendError(res, 'Token tidak valid', 401);
  }
};

module.exports = {
  auth,
};
