const { z } = require('zod');

const createTemplateSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter').max(255),
  description: z.string().optional(),
  letterType: z.string().min(1, 'Tipe surat wajib diisi'),
  htmlContent: z.string().min(1, 'Konten HTML wajib diisi'),
  cssStyles: z.string().optional(),
  pageSize: z.enum(['A4', 'F4', 'LETTER']).default('A4'),
  headerConfig: z.any().optional(),
  marginTop: z.coerce.number().int().min(0).max(100).optional(),
  marginRight: z.coerce.number().int().min(0).max(100).optional(),
  marginBottom: z.coerce.number().int().min(0).max(100).optional(),
  marginLeft: z.coerce.number().int().min(0).max(100).optional(),
});

const updateTemplateSchema = createTemplateSchema.partial();

module.exports = {
  createTemplateSchema,
  updateTemplateSchema,
};
