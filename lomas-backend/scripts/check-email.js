const nodemailer = require('nodemailer');
const { loadEmailConfig } = require('../config/email');

async function main() {
  let transporter;

  try {
    const config = loadEmailConfig();

    transporter = nodemailer.createTransport({
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
      logger: false,
      debug: false,
    });

    await transporter.verify();

    console.log('Conexión y autenticación con Gmail correctas.');
    console.log('No se envió ningún correo.');
  } catch (error) {
    const messages = {
      EAUTH: 'Gmail rechazó la credencial. Revisar la contraseña de aplicación.',
      EDNS: 'No se pudo resolver el servidor de Gmail.',
      ECONNECTION: 'No se pudo conectar con Gmail.',
      ETIMEDOUT: 'Se agotó el tiempo de conexión con Gmail.',
    };

    console.error(
      messages[error.code] ||
      'No se pudo verificar el correo. Revisar la configuración y conexión.'
    );

    process.exitCode = 1;
  } finally {
    if (transporter) transporter.close();
  }
}

main();