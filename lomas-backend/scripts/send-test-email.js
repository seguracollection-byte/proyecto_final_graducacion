const { enviarCorreo } = require('../services/emailService');

async function main() {
  try {
    await enviarCorreo(
      'seguracollection@gmail.com',
      'Prueba de correo — Lomas Eveneser',
      `<h1>Lomas Eveneser</h1>
       <p>El servicio de correo está funcionando.</p>
       <p>Este es un mensaje de prueba del proyecto universitario.
       No contiene contraseñas ni enlaces de acceso.</p>`
    );

    console.log('Gmail aceptó el mensaje. Revisá la bandeja y spam.');
  } catch {
    console.error(
      'No se pudo completar el envío. No se muestran detalles para proteger las credenciales.'
    );
    process.exitCode = 1;
  }
}

main();