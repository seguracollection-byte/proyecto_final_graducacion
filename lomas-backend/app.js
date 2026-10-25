const express = require('express');
const accessRequestRoutes = require('./routes/accessRequestRoutes');
const loginRoutes = require('./routes/loginRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const adminAccessRoutes = require('./routes/adminAccessRoutes');
const activationRoutes = require('./routes/activationRoutes');


const app = express();
const cors = require('cors');

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
app.use('/api/sesion', sessionRoutes);
app.use('/api/admin', adminAccessRoutes);
app.use('/api/activar-cuenta', activationRoutes);
app.use(cors());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    mode: 'development',
    database: 'on-demand',
    email: 'disabled',
  });
});

// Ruta nueva de Lomas: solicitudes pendientes de aprobación.
app.use('/api/solicitudes-acceso', accessRequestRoutes);

// Las rutas heredadas de barbería permanecen bloqueadas.
app.use('/api', (_req, res) => {
  res.status(503).json({
    success: false,
    message: 'API heredada deshabilitada durante diagnóstico',
  });
});

if (require.main === module) {
  const server = app.listen(
    Number(process.env.PORT || 3000),
    '127.0.0.1',
    () => {
      console.log('Servidor de Lomas en http://127.0.0.1:3000');
    }
  );

  process.on('SIGTERM', () => server.close());
}

module.exports = app;