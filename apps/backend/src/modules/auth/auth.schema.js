const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

module.exports = {
  loginSchema,
};
