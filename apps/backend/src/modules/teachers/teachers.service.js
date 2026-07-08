const prisma = require('../../config/database');
const xlsx = require('xlsx');
const csv = require('csv-parser');
const { Readable } = require('stream');

const createTeacher = async (data) => {
  const existing = await prisma.teacher.findUnique({
    where: { nip: data.nip }
  });

  if (existing) {
    const error = new Error(`Guru dengan NIP ${data.nip} sudah ada`);
    error.statusCode = 400;
    throw error;
  }

  const createData = { ...data };
  if (createData.birthDate) {
    createData.birthDate = new Date(createData.birthDate);
  }

  return await prisma.teacher.create({ data: createData });
};

const getAllTeachers = async (filters = {}, pagination = { page: 1, limit: 10 }) => {
  const where = {};

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { nip: { contains: filters.search, mode: 'insensitive' } },
      { position: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.position) {
    where.position = filters.position;
  }
  if (filters.subject) {
    where.subject = filters.subject;
  }
  if (filters.status) {
    where.status = filters.status;
  }

  const page = Number(pagination.page) || 1;
  const limit = Number(pagination.limit) || 10;
  const skip = (page - 1) * limit;

  const [total, data] = await Promise.all([
    prisma.teacher.count({ where }),
    prisma.teacher.findMany({
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

const getTeacherById = async (id) => {
  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) {
    const error = new Error('Guru tidak ditemukan');
    error.statusCode = 404;
    throw error;
  }
  return teacher;
};

const updateTeacher = async (id, data) => {
  await getTeacherById(id);

  if (data.nip) {
    const existing = await prisma.teacher.findFirst({
      where: { nip: data.nip, id: { not: id } }
    });
    if (existing) {
      const error = new Error(`Guru dengan NIP ${data.nip} sudah ada`);
      error.statusCode = 400;
      throw error;
    }
  }

  const updateData = { ...data };
  if (updateData.birthDate) {
    updateData.birthDate = new Date(updateData.birthDate);
  }
  Object.keys(updateData).forEach(k => {
    if (updateData[k] === undefined) delete updateData[k];
  });

  return await prisma.teacher.update({
    where: { id },
    data: updateData
  });
};

const deleteTeacher = async (id) => {
  await getTeacherById(id);
  return await prisma.teacher.delete({ where: { id } });
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
  const standardCleanKeys = [
    'nip', 'name', 'nama', 'position', 'jabatan', 'pangkat',
    'subject', 'mapel', 'mata_pelajaran', 'gender', 'jeniskelamin', 'jk',
    'phone', 'telp', 'no_hp', 'telepon', 'email',
    'address', 'alamat', 'nuptk', 'status', 'education', 'pendidikan',
    'birth_place', 'tempat_lahir', 'birth_date', 'tanggal_lahir',
  ];

  const normalized = {};
  const extraData = {};

  for (const key in row) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    normalized[cleanKey] = row[key];

    if (!standardCleanKeys.includes(cleanKey)) {
      const extraKey = key.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      if (extraKey) {
        extraData[extraKey] = String(row[key]);
      }
    }
  }

  let gender = 'MALE';
  const rawGender = String(normalized['gender'] || normalized['jeniskelamin'] || normalized['jk'] || '').toUpperCase();
  if (rawGender.includes('P') || rawGender.includes('F') || rawGender.includes('WANITA') || rawGender.includes('PEREMPUAN')) {
    gender = 'FEMALE';
  }

  let birthDate = null;
  const rawBirthDate = normalized['birth_date'] || normalized['tanggal_lahir'];
  if (rawBirthDate) {
    const parsed = new Date(rawBirthDate);
    if (!isNaN(parsed.getTime())) {
      birthDate = parsed;
    }
  }

  return {
    nip: String(normalized['nip'] || '').trim(),
    name: String(normalized['name'] || normalized['nama'] || '').trim(),
    position: String(normalized['position'] || normalized['jabatan'] || '').trim(),
    pangkat: normalized['pangkat'] ? String(normalized['pangkat']).trim() : null,
    subject: String(normalized['subject'] || normalized['mapel'] || normalized['mata_pelajaran'] || '').trim() || null,
    gender,
    phone: normalized['phone'] || normalized['telp'] || normalized['no_hp'] || normalized['telepon'] || null,
    email: normalized['email'] || null,
    address: normalized['address'] || normalized['alamat'] || null,
    nuptk: normalized['nuptk'] || null,
    status: normalized['status'] || null,
    education: normalized['education'] || normalized['pendidikan'] || null,
    birthPlace: normalized['birth_place'] || normalized['tempat_lahir'] || null,
    birthDate,
    extraData: Object.keys(extraData).length > 0 ? extraData : null,
  };
};

const importTeachers = async (fileBuffer, mimetype, originalname) => {
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

  const validTeachers = [];
  const errors = [];

  for (let i = 0; i < rawData.length; i++) {
    const rowNum = i + 2;
    const normalized = normalizeKeys(rawData[i]);

    if (!normalized.nip || !normalized.name || !normalized.position) {
      errors.push(`Baris ${rowNum}: NIP, Nama, dan Jabatan wajib diisi.`);
      continue;
    }

    validTeachers.push(normalized);
  }

  if (validTeachers.length === 0) {
    const error = new Error('Tidak ada data valid yang bisa diimport. Pastikan kolom sesuai.');
    error.details = errors;
    error.statusCode = 400;
    throw error;
  }

  let importedCount = 0;
  for (const teacher of validTeachers) {
    try {
      const data = { ...teacher };
      await prisma.teacher.create({ data });
      importedCount++;
    } catch (createErr) {
      if (createErr.code === 'P2002') {
        errors.push(`NIP ${teacher.nip}: sudah ada di database`);
      } else {
        errors.push(`NIP ${teacher.nip}: ${createErr.message}`);
      }
    }
  }

  return {
    importedCount,
    totalRows: rawData.length,
    errors,
  };
};

const deleteAllTeachers = async () => {
  const count = await prisma.teacher.count();

  if (count === 0) {
    const error = new Error('Tidak ada data guru untuk dihapus');
    error.statusCode = 404;
    throw error;
  }

  const result = await prisma.teacher.deleteMany({});

  return {
    deletedCount: result.count,
    message: `Berhasil menghapus ${result.count} data guru`,
  };
};

module.exports = {
  createTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  importTeachers,
  deleteAllTeachers,
};
