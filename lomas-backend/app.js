const express = require('express');
const app = express();
app.use(express.json({ limit: '100kb' }));
app.get('/health', (_req, res) => res.json({ status: 'ok', mode: 'diagnostic', database: 'disabled', email: 'disabled' }));
// Las rutas heredadas permanecen cerradas hasta reparar autenticación y validación.
app.use('/api', (_req, res) => res.status(503).json({ success: false, message: 'API heredada deshabilitada durante diagnóstico' }));
if (require.main === module) {
  const server = app.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log('Diagnóstico disponible en loopback; sin BD ni correo'));
  process.on('SIGTERM', () => server.close());
}
module.exports = app;
