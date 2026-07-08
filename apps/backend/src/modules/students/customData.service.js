const prisma = require('../../config/database');

/**
 * Custom Data Manager Service
 * Manages CRUD operations on Student.extraData JSON field
 */

/**
 * Validate custom data structure
 * Keys must be alphanumeric + underscore only
 * @param {Object} customData - Data to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
const validateCustomData = (customData) => {
  const errors = [];
  
  if (!customData || typeof customData !== 'object' || Array.isArray(customData)) {
    errors.push('Custom data harus berupa objek');
    return { valid: false, errors };
  }

  // Validate each key
  for (const key in customData) {
    // Key validation: 1-50 characters, alphanumeric + underscore only
    const keyRegex = /^[a-zA-Z0-9_]{1,50}$/;
    if (!keyRegex.test(key)) {
      errors.push(`Key '${key}' tidak valid. Gunakan hanya huruf, angka, dan underscore (1-50 karakter)`);
    }

    // Reserved field names that cannot be used as custom data keys
    const reservedFields = [
      'id', 'nisn', 'name', 'grade', 'className', 'gender', 
      'parentName', 'parentPhone', 'address', 'email', 
      'isActive', 'createdAt', 'updatedAt', 'extraData'
    ];
    
    if (reservedFields.includes(key)) {
      errors.push(`Key '${key}' adalah field reserved dan tidak boleh digunakan`);
    }

    // Value validation based on type
    const value = customData[key];
    
    if (value !== null && value !== undefined) {
      // String validation (max 500 chars)
      if (typeof value === 'string' && value.length > 500) {
        errors.push(`Nilai untuk key '${key}' terlalu panjang (maksimal 500 karakter)`);
      }
      
      // Number validation (-1e10 to 1e10)
      if (typeof value === 'number' && (value < -1e10 || value > 1e10)) {
        errors.push(`Nilai number untuk key '${key}' di luar range yang diperbolehkan`);
      }
      
      // Boolean and date string are allowed as-is
      // Date should be in ISO 8601 format, but we don't enforce strict validation
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        errors.push(`Tipe data untuk key '${key}' tidak didukung. Gunakan string, number, atau boolean`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Update custom data for a student
 * Merges new key-value pairs into existing extraData
 * @param {string} studentId - Student ID
 * @param {Object} customData - Key-value pairs to merge
 * @returns {Promise<Student>}
 */
const updateCustomData = async (studentId, customData) => {
  // Validate custom data structure
  const validation = validateCustomData(customData);
  if (!validation.valid) {
    const error = new Error('Validasi custom data gagal');
    error.statusCode = 400;
    error.details = validation.errors;
    throw error;
  }

  // Check if student exists
  const student = await prisma.student.findUnique({
    where: { id: studentId }
  });

  if (!student) {
    const error = new Error('Siswa tidak ditemukan');
    error.statusCode = 404;
    throw error;
  }

  // Get existing extraData or initialize as empty object
  const existingData = student.extraData || {};

  // Merge new data with existing data (new values overwrite old ones)
  const mergedData = {
    ...existingData,
    ...customData
  };

  // Check total size (rough estimate: JSON string length)
  const dataSize = JSON.stringify(mergedData).length;
  if (dataSize > 50000) {
    const error = new Error('Total ukuran extraData melebihi batas (maksimal ~50KB)');
    error.statusCode = 400;
    throw error;
  }

  // Update student with merged data
  try {
    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: {
        extraData: mergedData
      }
    });

    return updatedStudent;
  } catch (err) {
    const error = new Error('Gagal menyimpan custom data');
    error.statusCode = 500;
    error.details = err.message;
    throw error;
  }
};

/**
 * Get custom data for a student
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>}
 */
const getCustomData = async (studentId) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      extraData: true
    }
  });

  if (!student) {
    const error = new Error('Siswa tidak ditemukan');
    error.statusCode = 404;
    throw error;
  }

  return student.extraData || {};
};

/**
 * Delete specific keys from custom data
 * @param {string} studentId - Student ID
 * @param {string[]} keys - Keys to remove
 * @returns {Promise<Student>}
 */
const deleteCustomDataKeys = async (studentId, keys) => {
  if (!Array.isArray(keys) || keys.length === 0) {
    const error = new Error('Keys harus berupa array yang tidak kosong');
    error.statusCode = 400;
    throw error;
  }

  // Check if student exists
  const student = await prisma.student.findUnique({
    where: { id: studentId }
  });

  if (!student) {
    const error = new Error('Siswa tidak ditemukan');
    error.statusCode = 404;
    throw error;
  }

  // Get existing extraData
  const existingData = student.extraData || {};

  // Remove specified keys
  const updatedData = { ...existingData };
  keys.forEach(key => {
    delete updatedData[key];
  });

  // Update student
  const updatedStudent = await prisma.student.update({
    where: { id: studentId },
    data: {
      extraData: updatedData
    }
  });

  return updatedStudent;
};

module.exports = {
  validateCustomData,
  updateCustomData,
  getCustomData,
  deleteCustomDataKeys
};
