const prisma = require('../../config/database');
const xlsx = require('xlsx');
const csv = require('csv-parser');
const { Readable } = require('stream');

const createStudent = async (data) => {
  const existing = await prisma.student.findUnique({
    where: { nisn: data.nisn }
  });
  
  if (existing) {
    const error = new Error(`Siswa dengan NISN ${data.nisn} sudah ada`);
    error.statusCode = 400;
    throw error;
  }

  const className = data.grade;
  const grade = className.split('-')[0] || className;

  return await prisma.student.create({ 
    data: {
      ...data,
      className,
      grade,
      gender: data.gender || 'MALE'
    } 
  });
};

const getAllStudents = async (filters = {}, pagination = { page: 1, limit: 10 }) => {
  const where = {};
  
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { nisn: { contains: filters.search, mode: 'insensitive' } }
    ];
  }
  if (filters.grade) {
    where.grade = filters.grade;
  }
  if (filters.className) {
    where.className = filters.className;
  }

  const page = Number(pagination.page) || 1;
  const limit = Number(pagination.limit) || 10;
  const skip = (page - 1) * limit;

  const [total, data] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' }
    })
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

const getAllClasses = async () => {
  const result = await prisma.student.findMany({
    where: { isActive: true },
    select: { className: true },
    distinct: ['className'],
    orderBy: { className: 'asc' }
  });
  return result.map(r => r.className).filter(Boolean);
};

const getStudentById = async (id) => {
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) {
    const error = new Error('Siswa tidak ditemukan');
    error.statusCode = 404;
    throw error;
  }
  return student;
};

const updateStudent = async (id, data) => {
  await getStudentById(id);
  
  if (data.nisn) {
    const existing = await prisma.student.findFirst({
      where: { nisn: data.nisn, id: { not: id } }
    });
    if (existing) {
      const error = new Error(`Siswa dengan NISN ${data.nisn} sudah ada`);
      error.statusCode = 400;
      throw error;
    }
  }

  const updateData = { ...data };
  if (updateData.grade) {
    updateData.className = updateData.grade;
    updateData.grade = updateData.className.split('-')[0] || updateData.className;
  }

  return await prisma.student.update({
    where: { id },
    data: updateData
  });
};

const deleteStudent = async (id) => {
  await getStudentById(id);
  return await prisma.student.delete({ where: { id } });
};

const processExcel = (buffer) => {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(sheet, { raw: false });
};

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

const normalizeKeys = (row) => {
  const standardCleanKeys = ['nisn', 'name', 'nama', 'grade', 'kelas', 'classname', 'gender', 'jeniskelamin', 'jk', 'parentname', 'namaortu', 'namaorangtua', 'parentphone', 'nohportu', 'telportu', 'address', 'alamat'];
  
  const normalized = {};
  const extraData = {};
  
  for (const key in row) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    normalized[cleanKey] = row[key];
    
    if (!standardCleanKeys.includes(cleanKey)) {
      // Format key: "Tempat Lahir" -> "tempat_lahir"
      const extraKey = key.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      if (extraKey) {
        extraData[extraKey] = String(row[key]);
      }
    }
  }
  
  const className = String(normalized['grade'] || normalized['kelas'] || normalized['classname'] || '').trim();
  const grade = className.split('-')[0] || className;
  
  let gender = 'MALE';
  const rawGender = String(normalized['gender'] || normalized['jeniskelamin'] || normalized['jk'] || '').toUpperCase();
  if (rawGender.includes('P') || rawGender.includes('F') || rawGender.includes('WANITA')) {
    gender = 'FEMALE';
  }

  const pName = normalized['parentname'] || normalized['namaortu'] || normalized['namaorangtua'];
  const pPhone = normalized['parentphone'] || normalized['nohportu'] || normalized['telportu'];
  const addr = normalized['address'] || normalized['alamat'];

  return {
    nisn: String(normalized['nisn'] || '').trim(),
    name: String(normalized['name'] || normalized['nama'] || '').trim(),
    grade: grade,
    className: className,
    gender: gender,
    parentName: pName != null ? String(pName) : null,
    parentPhone: pPhone != null ? String(pPhone) : null,
    address: addr != null ? String(addr) : null,
    extraData: Object.keys(extraData).length > 0 ? extraData : null
  };
};

const importStudents = async (fileBuffer, mimetype, originalname) => {
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

  if (rawData.length === 0) {
    const error = new Error('File kosong atau tidak terbaca');
    error.statusCode = 400;
    throw error;
  }

  const validStudents = [];
  const errors = [];

  for (let i = 0; i < rawData.length; i++) {
    const rowNum = i + 2;
    const normalized = normalizeKeys(rawData[i]);
    
    if (!normalized.nisn || !normalized.name || !normalized.grade) {
      errors.push(`Baris ${rowNum}: NISN, Nama, dan Kelas wajib diisi.`);
      continue;
    }
    
    validStudents.push(normalized);
  }

  if (validStudents.length === 0) {
    const error = new Error('Tidak ada data valid yang bisa diimport. Pastikan kolom sesuai.');
    error.details = errors;
    error.statusCode = 400;
    throw error;
  }

  const result = await prisma.student.createMany({
    data: validStudents,
    skipDuplicates: true
  });

  return {
    importedCount: result.count,
    totalRows: rawData.length,
    errors
  };
};

/**
 * Delete all students from database
 * WARNING: This is a destructive operation
 * @returns {Promise<Object>} - Delete result with count
 */
const deleteAllStudents = async () => {
  // Get count before delete
  const count = await prisma.student.count();
  
  if (count === 0) {
    const error = new Error('Tidak ada data siswa untuk dihapus');
    error.statusCode = 404;
    throw error;
  }

  // Delete all students
  const result = await prisma.student.deleteMany({});

  return {
    deletedCount: result.count,
    message: `Berhasil menghapus ${result.count} data siswa`
  };
};

module.exports = {
  createStudent,
  getAllStudents,
  getAllClasses,
  getStudentById,
  updateStudent,
  deleteStudent,
  importStudents,
  deleteAllStudents
};
