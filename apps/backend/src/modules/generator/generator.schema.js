const { z } = require('zod');

const generateSchema = z.object({
  templateId: z.string().cuid(),
  studentIds: z.array(z.string().cuid()).min(1, 'Pilih minimal 1 siswa'),
  outputType: z.enum(['PDF_SINGLE', 'ZIP_BUNDLE']),
  filterClass: z.string().optional().nullable(),
  customData: z.record(z.any()).optional(),
  teacherId: z.string().cuid().optional().nullable(),
});

module.exports = {
  generateSchema
};
