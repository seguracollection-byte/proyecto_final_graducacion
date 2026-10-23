// No carga .env de la barbería. La conexión requiere habilitación explícita.
const mysql = require('mysql2/promise');
if (process.env.ENABLE_LEGACY_API !== 'true' || process.env.DB_NAME !== 'lomas_eveneser_dev') {
  throw new Error('Base no habilitada: usar una base separada lomas_eveneser_dev.');
}
for (const key of ['DB_HOST', 'DB_USER', 'DB_PASSWORD']) {
  if (!process.env[key]) throw new Error(`Falta ${key}`);
}
module.exports = mysql.createPool({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, waitForConnections: true,
  connectionLimit: 5, queueLimit: 0
});
