const prisma = require('../../config/database');
const { sendSuccess, sendError } = require('../../utils/response.helper');
const bcrypt = require('bcryptjs');
const z = require('zod');

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Password lama minimal 6 karakter'),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
  confirmPassword: z.string().min(6, 'Konfirmasi password minimal 6 karakter')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Password baru dan konfirmasi tidak cocok",
  path: ["confirmPassword"]
});

const changePassword = async (req, res, next) => {
  try {
    const validatedData = passwordSchema.parse(req.body);
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return sendError(res, 'User tidak ditemukan', 404);
    }

    const isMatch = await bcrypt.compare(validatedData.currentPassword, user.passwordHash);
    if (!isMatch) {
      return sendError(res, 'Password lama salah', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(validatedData.newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword }
    });

    return sendSuccess(res, null, 'Password berhasil diubah');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, error.errors[0].message, 400);
    }
    next(error);
  }
};

module.exports = {
  changePassword
};
