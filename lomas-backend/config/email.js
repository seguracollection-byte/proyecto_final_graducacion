const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

function loadEmailConfig() {
  const file = path.join(__dirname, '..', '.env.lomas.local');

  if (!fs.existsSync(file)) {
    throw new Error('Falta el archivo .env.lomas.local');
  }

  const values = dotenv.parse(fs.readFileSync(file));

  if (
    values.SMTP_HOST !== 'smtp.gmail.com' ||
    values.SMTP_PORT !== '465' ||
    values.SMTP_SECURE !== 'true'
  ) {
    throw new Error('Revisar la configuración SMTP de Gmail');
  }

  if (
    values.SMTP_USER !== 'lomaseveneser@gmail.com' ||
    values.MAIL_FROM_ADDRESS !== 'lomaseveneser@gmail.com'
  ) {
    throw new Error('El remitente debe ser la cuenta de Lomas Eveneser');
  }

  if (
    !values.SMTP_PASSWORD ||
    values.SMTP_PASSWORD === 'PEGAR_CLAVE_DE_APLICACION'
  ) {
    throw new Error('Falta configurar la contraseña de aplicación');
  }

  return {
    enabled: values.EMAIL_ENABLED === 'true',
    host: values.SMTP_HOST,
    port: Number(values.SMTP_PORT),
    secure: true,
    user: values.SMTP_USER,
    password: values.SMTP_PASSWORD,
    fromName: values.MAIL_FROM_NAME || 'Lomas Eveneser',
    fromAddress: values.MAIL_FROM_ADDRESS,
  };
}

module.exports = { loadEmailConfig };