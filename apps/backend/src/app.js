const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { validateEnv, ENV } = require('./config/env');
const { errorHandler } = require('./middleware/error.middleware');
const { securityMiddleware } = require('./middleware/security.middleware');
const { sendSuccess } = require('./utils/response.helper');

validateEnv();

const app = express();

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: ENV.isProduction ? undefined : false,
}));
app.use(securityMiddleware);

// CORS
app.use(cors({
  origin: function (origin, callback) {
    const allowed = process.env.FRONTEND_URL || 'http://localhost:5173';
    const origins = allowed.split(',');
    if (!origin || origins.some(o => origin.startsWith(o.replace('*', '')))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body Parser & Cookie Parser
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../../public')));

// Trust proxy for accurate IP detection behind reverse proxy
app.set('trust proxy', 1);

// Rate Limiting — generous global limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak request dari IP ini, coba lagi nanti.'
  }
});
app.use(limiter);

// Health Check
app.get('/health', (req, res) => {
  return sendSuccess(res, { status: 'UP' }, 'Server is healthy');
});

// API Routes
const authRoutes = require('./modules/auth/auth.routes');
const templatesRoutes = require('./modules/templates/templates.routes');
const studentsRoutes = require('./modules/students/students.routes');
const generatorRoutes = require('./modules/generator/generator.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const usersRoutes = require('./modules/users/users.routes');
const uploadsRoutes = require('./modules/uploads/uploads.routes');
const settingsRoutes = require('./modules/settings/settings.routes');
const teachersRoutes = require('./modules/teachers/teachers.routes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/templates', templatesRoutes);
app.use('/api/v1/students', studentsRoutes);
app.use('/api/v1/generate', generatorRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/uploads', uploadsRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/teachers', teachersRoutes);
// app.use('/api/v1/logs', require('./modules/logs/logs.routes'));

// 404 Handler
app.use((req, res, next) => {
  const error = new Error(`Route tidak ditemukan - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
