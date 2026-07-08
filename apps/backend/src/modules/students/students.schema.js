const { z } = require('zod');

const studentSchema = z.object({
  nisn: z.string().min(5, 'NISN minimal 5 karakter').max(20, 'NISN maksimal 20 karakter'),
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  grade: z.string().min(1, 'Kelas wajib diisi'),
  gender: z.enum(['MALE', 'FEMALE']).optional().default('MALE'),
  parentName: z.string().optional().nullable(),
  parentPhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  extraData: z.record(z.any()).optional().nullable(),
});

module.exports = {
  studentSchema,
};
