const express = require('express');
const cors = require('cors');

const accessRequestRoutes = require('./routes/accessRequestRoutes');
const loginRoutes = require('./routes/loginRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const adminAccessRoutes = require('./routes/adminAccessRoutes');
const activationRoutes = require('./routes/activationRoutes');
const recoveryRoutes = require('./routes/recoveryRoutes');
const resetPasswordRoutes = require('./routes/resetPasswordRoutes');
const mfaRoutes = require('./routes/mfaRoutes');
const biometricRoutes = require('./routes/biometricRoutes');

const app = express();
app.disable('x-powered-by');
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use(cors({
  origin: [
    'http://localhost:8082',
    'http://127.0.0.1:8082',
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Retry-After', 'RateLimit'],
  credentials: false,
}));

app.use(express.json({ limit: '100kb' }));

app.use('/api/login', loginRoutes);
app.use('/api/mfa', mfaRoutes);
app.use('/api/biometria', biometricRoutes);
app.use('/api/sesion', sessionRoutes);
app.use('/api/admin', adminAccessRoutes);
app.use('/api/activar-cuenta', activationRoutes);
app.use('/api/recuperar-password', recoveryRoutes);
app.use('/api/restablecer-password', resetPasswordRoutes);
app.use('/api/solicitudes-acceso', accessRequestRoutes);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    mode: 'development',
    database: 'on-demand',
    email: 'disabled',
  });
});

// Respuesta para rutas de API que no existen.
app.use('/api', (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada.',
  });
});

// Nunca devuelve trazas ni rutas locales al cliente, incluso ante JSON inválido.
app.use((error, _req, res, _next) => {
  const status = error.type === 'entity.too.large' ? 413
    : error.type === 'entity.parse.failed' ? 400 : 503;
  res.status(status).json({
    success: false,
    message: status === 413 ? 'La solicitud es demasiado grande.'
      : status === 400 ? 'El contenido de la solicitud no es válido.'
      : 'No se pudo completar la solicitud. Intentá nuevamente.',
  });
});

if (require.main === module) {
  const server = app.listen(
    Number(process.env.PORT || 3000),
    '0.0.0.0',
    () => {
      console.log('Servidor de Lomas en http://0.0.0.0:3000');
    }
  );

  process.on('SIGTERM', () => server.close());
}

module.exports = app;