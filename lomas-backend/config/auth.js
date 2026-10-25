const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

function loadAuthConfig() {
  const file = path.join(__dirname, '..', '.env.lomas.local');

  if (!fs.existsSync(file)) {
    throw new Error('Falta el archivo .env.lomas.local');
  }

  const values = dotenv.parse(fs.readFileSync(file));
  const secret = values.JWT_SECRET;

  if (!secret || !/^[a-f0-9]{96}$/i.test(secret)) {
    throw new Error(
      'JWT_SECRET debe contener los 96 caracteres hexadecimales generados'
    );
  }

  if (values.JWT_EXPIRES_IN !== '1h') {
    throw new Error('JWT_EXPIRES_IN debe ser 1h');
  }

  return {
    secret,
    expiresIn: values.JWT_EXPIRES_IN,
    algorithm: 'HS256',
    issuer: 'lomas-eveneser-api',
    audience: 'lomas-eveneser-app',
  };
}

module.exports = { loadAuthConfig };