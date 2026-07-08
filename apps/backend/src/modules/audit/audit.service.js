const prisma = require('../../config/database');

const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  REFRESH_TOKEN: 'REFRESH_TOKEN',
  DELETE_ALL_STUDENTS: 'DELETE_ALL_STUDENTS',
  DELETE_ALL_TEACHERS: 'DELETE_ALL_TEACHERS',
  IMPORT_STUDENTS: 'IMPORT_STUDENTS',
  IMPORT_TEACHERS: 'IMPORT_TEACHERS',
};

const log = async ({ userId, action, details, ip, userAgent }) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        details: details ? JSON.stringify(details) : null,
        ip: ip || null,
        userAgent: userAgent || null,
      },
    });
  } catch (error) {
    console.error(`[AUDIT] Failed to log action ${action}:`, error.message);
  }
};

const loginSuccess = (userId, ip, userAgent) =>
  log({ userId, action: AUDIT_ACTIONS.LOGIN_SUCCESS, ip, userAgent });

const loginFailed = (email, ip, userAgent) =>
  log({ action: AUDIT_ACTIONS.LOGIN_FAILED, details: { email }, ip, userAgent });

const logout = (userId, ip) =>
  log({ userId, action: AUDIT_ACTIONS.LOGOUT, details: null, ip });

const refreshToken = (userId, ip) =>
  log({ userId, action: AUDIT_ACTIONS.REFRESH_TOKEN, ip });

const deleteAllStudents = (userId, count, ip) =>
  log({ userId, action: AUDIT_ACTIONS.DELETE_ALL_STUDENTS, details: { count }, ip });

const deleteAllTeachers = (userId, count, ip) =>
  log({ userId, action: AUDIT_ACTIONS.DELETE_ALL_TEACHERS, details: { count }, ip });

const importStudents = (userId, result, ip) =>
  log({ userId, action: AUDIT_ACTIONS.IMPORT_STUDENTS, details: result, ip });

const importTeachers = (userId, result, ip) =>
  log({ userId, action: AUDIT_ACTIONS.IMPORT_TEACHERS, details: result, ip });

module.exports = {
  audit: {
    log,
    loginSuccess,
    loginFailed,
    logout,
    refreshToken,
    deleteAllStudents,
    deleteAllTeachers,
    importStudents,
    importTeachers,
  },
  AUDIT_ACTIONS,
};
