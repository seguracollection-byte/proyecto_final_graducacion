const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

function validateDevelopmentDatabase(values) {
  if (values.DB_HOST !== '127.0.0.1' || values.DB_NAME !== 'lomas_eveneser_dev' || values.DB_USER !== 'lomas_app_dev') {
    throw new Error('Usar exclusivamente 127.0.0.1, lomas_eveneser_dev y lomas_app_dev.');
  }
  if (values.DB_PORT !== '3306') throw new Error('El puerto de desarrollo confirmado es 3306.');
  if (!values.DB_PASSWORD || values.DB_PASSWORD === 'CAMBIAR_SOLO_LOCALMENTE') {
    throw new Error('Falta configurar DB_PASSWORD en .env.lomas.local.');
  }
  return {
    host: values.DB_HOST, port: Number(values.DB_PORT), database: values.DB_NAME,
    user: values.DB_USER, password: values.DB_PASSWORD, connectTimeout: 5000,
    multipleStatements: false
  };
}

function loadDevelopmentDatabase() {
  const file = path.join(__dirname, '..', '.env.lomas.local');
  if (!fs.existsSync(file)) throw new Error('Falta lomas-backend/.env.lomas.local; copiar .env.lomas.example.');
  // Lee únicamente el archivo nuevo. No combina process.env ni el .env heredado.
  return validateDevelopmentDatabase(dotenv.parse(fs.readFileSync(file)));
}
module.exports = { loadDevelopmentDatabase, validateDevelopmentDatabase };
