const prisma = require('../../config/database');
const { sendSuccess } = require('../../utils/response.helper');

const getDashboardStats = async (req, res, next) => {
  try {
    const [totalTemplates, totalStudents, totalGenerations] = await Promise.all([
      prisma.template.count(),
      prisma.student.count(),
      prisma.generationLog.count()
    ]);

    // Ambil 5 riwayat terbaru yang selesai
    const recentActivities = await prisma.generationLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        template: { select: { title: true } },
        generatedByUser: { select: { name: true } }
      }
    });

    const data = {
      stats: {
        totalTemplates,
        totalStudents,
        totalGenerations
      },
      recentActivities: recentActivities.map(log => ({
        ...log,
        fileSize: log.fileSize ? Number(log.fileSize) : null
      }))
    };

    return sendSuccess(res, data, 'Data dashboard berhasil diambil');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats
};
