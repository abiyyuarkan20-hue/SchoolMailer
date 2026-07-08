const prisma = require('../../config/database');
const xlsx = require('xlsx');
const csv = require('csv-parser');
const { Readable } = require('stream');
const customDataService = require('./customData.service');

/**
 * Bulk Import Service
 * Handles CSV/Excel import for student custom data
 */

/**
 * Standard field mappings - these fields map to Student model, not extraData
 */
const STANDARD_FIELD_MAP = {
  'nisn': 'nisn',
  'name': 'name',
  'nama': 'name',
  'grade': 'grade',
  'kelas': 'grade',
  'classname': 'className',
  'class_name': 'className',
  'gender': 'gender',
  'jeniskelamin': 'gender',
  'jenis_kelamin': 'gender',
  'jk': 'gender',
  'parentname': 'parentName',
  'parent_name': 'parentName',
  'namaorangtua': 'parentName',
  'nama_orang_tua': 'parentName',
  'parentphone': 'parentPhone',
  'parent_phone': 'parentPhone',
  'nohportu': 'parentPhone',
  'no_hp_ortu': 'parentPhone',
  'address': 'address',
  'alamat': 'address',
  'email': 'email'
};

/**
 * Normalize column name to lowercase with underscores
 * @param {string} columnName - Raw column name
 * @returns {string} - Normalized name
 */
const normalizeColumnName = (columnName) => {
  return columnName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_') // Replace non-alphanumeric with underscore
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
};

/**
 * Check if a normalized column is a standard field
 * @param {string} normalizedKey - Normalized column name
 * @returns {boolean}
 */
const isStandardField = (normalizedKey) => {
  return STANDARD_FIELD_MAP.hasOwnProperty(normalizedKey);
};

/**
 * Extract custom data from a row (non-standard fields only)
 * @param {Object} row - Parsed row data
 * @returns {Object} - { standardFields, customData }
 */
const extractCustomData = (row) => {
  const standardFields = {};
  const customData = {};
  const columnMapping = {}; // Track original -> normalized for duplicate detection

  for (const originalKey in row) {
    const normalizedKey = normalizeColumnName(originalKey);
    
    // Track column mapping for duplicate detection
    if (!columnMapping[normalizedKey]) {
      columnMapping[normalizedKey] = [];
    }
    columnMapping[normalizedKey].push(originalKey);

    const value = row[originalKey];

    // Check if this is a standard field
    if (isStandardField(normalizedKey)) {
      const mappedField = STANDARD_FIELD_MAP[normalizedKey];
      standardFields[mappedField] = value;
    } else {
      // Custom field - store with normalized key
      customData[normalizedKey] = value === '' ? null : value;
    }
  }

  // Detect duplicate columns after normalization
  const duplicates = [];
  for (const normalized in columnMapping) {
    if (columnMapping[normalized].length > 1) {
      duplicates.push({
        normalized,
        originals: columnMapping[normalized]
      });
    }
  }

  return {
    standardFields,
    customData,
    duplicates
  };
};

/**
 * Process Excel file
 * @param {Buffer} buffer - File buffer
 * @returns {Array} - Parsed rows
 */
const processExcel = (buffer) => {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(sheet);
};

/**
 * Process CSV file
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<Array>} - Parsed rows
 */
const processCsv = (buffer) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer.toString('utf-8'));
    
    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

/**
 * Import custom data from CSV/Excel file
 * @param {Buffer} fileBuffer - File content
 * @param {string} mimetype - File MIME type
 * @param {string} originalname - Original filename
 * @returns {Promise<ImportResult>}
 */
const importCustomData = async (fileBuffer, mimetype, originalname) => {
  // File size validation (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (fileBuffer.length > maxSize) {
    const error = new Error('Ukuran file melebihi batas (maksimal 10MB)');
    error.statusCode = 400;
    throw error;
  }

  // Parse file based on format
  let rawData = [];
  
  if (originalname.endsWith('.csv') || mimetype === 'text/csv') {
    rawData = await processCsv(fileBuffer);
  } else if (originalname.endsWith('.xlsx') || mimetype.includes('excel') || mimetype.includes('spreadsheet')) {
    rawData = processExcel(fileBuffer);
  } else {
    const error = new Error('Format file tidak didukung. Gunakan .csv atau .xlsx');
    error.statusCode = 400;
    throw error;
  }

  // Validate file is not empty
  if (rawData.length === 0) {
    const error = new Error('File kosong atau tidak memiliki data');
    error.statusCode = 400;
    throw error;
  }

  // Check NISN column exists
  const firstRow = rawData[0];
  const normalizedKeys = Object.keys(firstRow).map(normalizeColumnName);
  
  if (!normalizedKeys.includes('nisn')) {
    const error = new Error('Kolom NISN tidak ditemukan. File harus memiliki kolom NISN');
    error.statusCode = 400;
    throw error;
  }

  // Process import
  const result = {
    importedCount: 0,
    totalRows: rawData.length,
    skippedCount: 0,
    errors: [],
    warnings: []
  };

  // Collect all duplicates from first row for warnings
  const { duplicates } = extractCustomData(firstRow);
  if (duplicates.length > 0) {
    duplicates.forEach(dup => {
      result.warnings.push({
        message: `Kolom '${dup.originals.join("', '")}' dinormalisasi menjadi '${dup.normalized}' yang sama`
      });
    });
  }

  // Process each row
  for (let i = 0; i < rawData.length; i++) {
    const rowNum = i + 2; // Excel/CSV row number (1-indexed + header)
    const row = rawData[i];

    try {
      // Extract NISN
      const { standardFields, customData } = extractCustomData(row);
      const nisn = String(standardFields.nisn || '').trim();

      // Validate NISN is not empty
      if (!nisn || nisn === '') {
        result.errors.push({
          row: rowNum,
          nisn: '',
          message: 'NISN wajib diisi dan tidak boleh kosong'
        });
        result.skippedCount++;
        continue;
      }

      // Find student by NISN
      const student = await prisma.student.findUnique({
        where: { nisn }
      });

      if (!student) {
        result.errors.push({
          row: rowNum,
          nisn: nisn,
          message: 'NISN tidak ditemukan di database'
        });
        result.skippedCount++;
        continue;
      }

      // Validate custom data
      const validation = customDataService.validateCustomData(customData);
      if (!validation.valid) {
        result.errors.push({
          row: rowNum,
          nisn: nisn,
          message: validation.errors.join('; ')
        });
        result.skippedCount++;
        continue;
      }

      // Update custom data for student
      await customDataService.updateCustomData(student.id, customData);
      result.importedCount++;

    } catch (error) {
      result.errors.push({
        row: rowNum,
        nisn: row.nisn || '',
        message: error.message || 'Error tidak diketahui'
      });
      result.skippedCount++;
    }
  }

  return result;
};

module.exports = {
  normalizeColumnName,
  extractCustomData,
  importCustomData
};
