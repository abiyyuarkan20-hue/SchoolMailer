const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

const JWT_SECRET_MIN_LENGTH = 32;

const validateEnv = () => {
  const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error(`[SECURITY] Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  if (process.env.JWT_ACCESS_SECRET.length < JWT_SECRET_MIN_LENGTH) {
    console.error(`[SECURITY] JWT_ACCESS_SECRET terlalu pendek (min ${JWT_SECRET_MIN_LENGTH} karakter). Gunakan secret yang lebih kuat.`);
    process.exit(1);
  }

  if (process.env.JWT_REFRESH_SECRET.length < JWT_SECRET_MIN_LENGTH) {
    console.error(`[SECURITY] JWT_REFRESH_SECRET terlalu pendek (min ${JWT_SECRET_MIN_LENGTH} karakter). Gunakan secret yang lebih kuat.`);
    process.exit(1);
  }

  if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
    console.error('[SECURITY] JWT_ACCESS_SECRET dan JWT_REFRESH_SECRET tidak boleh sama.');
    process.exit(1);
  }

  if (process.env.JWT_ACCESS_SECRET.startsWith('ganti-') || process.env.JWT_REFRESH_SECRET.startsWith('ganti-')) {
    console.warn('[SECURITY] Peringatan: JWT secret masih menggunakan nilai default. Ganti dengan secret yang aman!');
  }

  console.log('[SECURITY] Environment variables validated successfully.');
};

const ENV = {
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  maxUploadSizeMB: parseInt(process.env.MAX_UPLOAD_SIZE_MB, 10) || 10,
  outputDir: process.env.OUTPUT_DIR || './storage/outputs',
  tempDir: process.env.TEMP_DIR || './storage/temp',
  outputFileTTLHours: parseInt(process.env.OUTPUT_FILE_TTL_HOURS, 10) || 24,
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
};

module.exports = { validateEnv, ENV };
