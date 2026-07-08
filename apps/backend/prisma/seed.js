const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Create Admin User
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@schoolmailer.com' },
    update: {},
    create: {
      email: 'admin@schoolmailer.com',
      name: 'Super Admin',
      passwordHash,
      role: 'ADMIN',
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  // 2. Create Sample Students
  const students = await Promise.all([
    prisma.student.upsert({
      where: { nisn: '1234567890' },
      update: {},
      create: {
        nisn: '1234567890',
        name: 'Budi Santoso',
        grade: 'X',
        className: 'X-A',
        gender: 'MALE',
        parentName: 'Agus Santoso',
        parentPhone: '08123456789',
        address: 'Jl. Merdeka No. 1, Medan',
      },
    }),
    prisma.student.upsert({
      where: { nisn: '0987654321' },
      update: {},
      create: {
        nisn: '0987654321',
        name: 'Siti Aminah',
        grade: 'XI',
        className: 'XI-IPA-1',
        gender: 'FEMALE',
        parentName: 'Hasanuddin',
        parentPhone: '08198765432',
        address: 'Jl. Pahlawan No. 10, Medan',
      },
    }),
  ]);
  console.log(`Created ${students.length} sample students.`);

  // 3. Create Sample Template
  const template = await prisma.template.create({
    data: {
      title: 'Surat Panggilan Orang Tua',
      letterType: 'PARENT_SUMMON',
      description: 'Template standar untuk pemanggilan orang tua siswa.',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="text-align: center;">SURAT PANGGILAN ORANG TUA</h2>
          <p>Kepada Yth. Bapak/Ibu <strong>{{nama_orang_tua}}</strong></p>
          <p>Orang tua/wali dari siswa:</p>
          <ul>
            <li>Nama: {{nama_siswa}}</li>
            <li>NISN: {{nisn}}</li>
            <li>Kelas: {{kelas}}</li>
          </ul>
          <p>Dimohon kehadirannya di sekolah pada hari Senin, 15 Juli 2026 pukul 09.00 WIB.</p>
          <p>Demikian surat ini disampaikan. Terima kasih.</p>
        </div>
      `,
      variables: ['{{nama_orang_tua}}', '{{nama_siswa}}', '{{nisn}}', '{{kelas}}'],
      createdBy: admin.id,
    },
  });
  console.log(`Created sample template: ${template.title}`);

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
