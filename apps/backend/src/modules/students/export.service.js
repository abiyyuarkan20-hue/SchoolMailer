const prisma = require('../../config/database');
const xlsx = require('xlsx');

/**
 * Export Service
 * Handles export of student data with custom fields to CSV/Excel
 */

/**
 * Collect all unique custom keys across students
 * @param {Student[]} students - Student records
 * @returns {string[]} - Sorted unique keys
 */
const collectCustomKeys = (students) => {
  const keysSet = new Set();

  students.forEach(student => {
    if (student.extraData && typeof student.extraData === 'object') {
      Object.keys(student.extraData).forEach(key => {
        keysSet.add(key);
      });
    }
  });

  // Return sorted array for consistent column ordering
  return Array.from(keysSet).sort();
};

/**
 * Export student data with custom fields
 * @param {Object} filters - Student filters (grade, className, etc.)
 * @param {string} format - 'csv' | 'xlsx'
 * @returns {Promise<Buffer>}
 */
const exportStudentData = async (filters = {}, format = 'xlsx') => {
  // Build where clause for filtering
  const where = {
    isActive: true
  };

  if (filters.grade) {
    where.grade = filters.grade;
  }

  if (filters.className) {
    where.className = filters.className;
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { nisn: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  // Fetch students
  const students = await prisma.student.findMany({
    where,
    orderBy: [
      { grade: 'asc' },
      { className: 'asc' },
      { name: 'asc' }
    ]
  });

  if (students.length === 0) {
    const error = new Error('Tidak ada data siswa untuk diekspor');
    error.statusCode = 404;
    throw error;
  }

  // Collect all unique custom keys
  const customKeys = collectCustomKeys(students);

  // Build data rows
  const rows = students.map(student => {
    const row = {
      'NISN': student.nisn,
      'Name': student.name,
      'Grade': student.grade,
      'Class': student.className,
      'Gender': student.gender,
      'Parent Name': student.parentName || '',
      'Parent Phone': student.parentPhone || '',
      'Address': student.address || '',
      'Email': student.email || ''
    };

    // Add custom data columns
    customKeys.forEach(key => {
      const value = student.extraData && student.extraData[key] !== undefined
        ? student.extraData[key]
        : '';
      row[key] = value;
    });

    return row;
  });

  // Generate file based on format
  if (format === 'csv') {
    return generateCsv(rows);
  } else {
    return generateExcel(rows);
  }
};

/**
 * Generate CSV buffer from rows
 * @param {Object[]} rows - Data rows
 * @returns {Buffer}
 */
const generateCsv = (rows) => {
  if (rows.length === 0) {
    return Buffer.from('');
  }

  // Get headers from first row
  const headers = Object.keys(rows[0]);
  
  // Build CSV content
  const csvLines = [];
  
  // Add header row
  csvLines.push(headers.map(escapeCsv).join(','));
  
  // Add data rows
  rows.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      return escapeCsv(String(value !== null && value !== undefined ? value : ''));
    });
    csvLines.push(values.join(','));
  });

  const csvContent = csvLines.join('\n');
  
  // Add BOM for Excel compatibility with UTF-8
  const BOM = '\uFEFF';
  return Buffer.from(BOM + csvContent, 'utf-8');
};

/**
 * Escape CSV value (handle quotes and commas)
 * @param {string} value - Value to escape
 * @returns {string}
 */
const escapeCsv = (value) => {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

/**
 * Generate Excel buffer from rows
 * @param {Object[]} rows - Data rows
 * @returns {Buffer}
 */
const generateExcel = (rows) => {
  // Create worksheet from JSON
  const worksheet = xlsx.utils.json_to_sheet(rows);

  // Create workbook
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Students');

  // Generate buffer
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Get filename with timestamp
 * @param {string} format - File format
 * @returns {string}
 */
const getExportFilename = (format = 'xlsx') => {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `students_export_${timestamp}.${format}`;
};

module.exports = {
  collectCustomKeys,
  exportStudentData,
  getExportFilename
};
