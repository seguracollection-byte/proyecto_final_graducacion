const nodemailer = require('nodemailer');
const { loadEmailConfig } = require('../config/email');

async function enviarCorreo(destinatario, asunto, cuerpoHtml) {
  const config = loadEmailConfig();

  if (!config.enabled) {
    throw new Error('El envío de correos está deshabilitado');
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
    debug: false,
  });

  try {
    const info = await transporter.sendMail({
      from: {
        name: config.fromName,
        address: config.fromAddress,
      },
      to: destinatario,
      subject: asunto,
      html: cuerpoHtml,
    });

    if (!info.accepted || info.accepted.length === 0) {
      throw new Error('El servidor no aceptó destinatarios');
    }

    return { success: true, messageId: info.messageId };
  } finally {
    transporter.close();
  }
}

module.exports = { enviarCorreo };