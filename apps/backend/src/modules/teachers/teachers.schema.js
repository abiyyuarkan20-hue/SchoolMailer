const { z } = require('zod');

const teacherSchema = z.object({
  nip: z.string().min(5, 'NIP minimal 5 karakter').max(30, 'NIP maksimal 30 karakter'),
  nik: z.string().optional().nullable(),
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  position: z.string().min(1, 'Jabatan wajib diisi'),
  pangkat: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE']).optional().default('MALE'),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  nuptk: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  education: z.string().optional().nullable(),
  unitKerja: z.string().optional().nullable(),
  instansi: z.string().optional().nullable(),
  birthPlace: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  extraData: z.record(z.any()).optional().nullable(),
});

module.exports = { teacherSchema };
