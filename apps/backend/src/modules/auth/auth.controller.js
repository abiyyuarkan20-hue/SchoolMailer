const authService = require('./auth.service');
const prisma = require('../../config/database');
const { sendSuccess } = require('../../utils/response.helper');
const { audit } = require('../audit/audit.service');
const { httpOnlyCookieOptions, extractClientInfo } = require('../../middleware/security.middleware');
const jwt = require('jsonwebtoken');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.validatedData;
    const { ip, userAgent } = extractClientInfo(req);
    const { user, accessToken, refreshToken } = await authService.login(email, password);

    res.cookie('refreshToken', refreshToken, httpOnlyCookieOptions());

    audit.loginSuccess(user.id, ip, userAgent);

    return sendSuccess(res, { user, accessToken }, 'Login berhasil');
  } catch (error) {
    const { ip, userAgent } = extractClientInfo(req);
    if (error.statusCode === 401) {
      const attemptedEmail = req.validatedData?.email || 'unknown';
      audit.loginFailed(attemptedEmail, ip, userAgent);
    }
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    const { ip } = extractClientInfo(req);
    const { accessToken } = await authService.refresh(token);

    const decoded = jwt.decode(token);
    if (decoded?.userId) {
      audit.refreshToken(decoded.userId, ip);
    }

    return sendSuccess(res, { accessToken }, 'Token berhasil diperbarui');
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    const { ip } = extractClientInfo(req);

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        if (decoded && decoded.userId) {
          await authService.logout(decoded.userId);
          audit.logout(decoded.userId, ip);
        }
      } catch (err) {
        try {
          const decoded = jwt.decode(token);
          if (decoded?.userId) {
            await prisma.user.update({
              where: { id: decoded.userId },
              data: { refreshToken: null },
            }).catch(() => {});
          }
        } catch (e) {}
      }
    }

    res.clearCookie('refreshToken');
    return sendSuccess(res, null, 'Logout berhasil');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  refresh,
  logout,
};
