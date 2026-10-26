const { enviarCorreo } = require('./emailService');
const { buildRecoveryLink } = require('../config/accountLinks');

async function sendRecoveryEmail(email, token) {
  const link = buildRecoveryLink(token);

  const safeLink = link
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const result = await enviarCorreo(
    email,
    'Recuperá tu contraseña — Lomas Eveneser',
    `
      <h1>Lomas Eveneser</h1>

      <p>Recibimos una solicitud para restablecer
      la contraseña de tu cuenta.</p>

      <p>
        <a href="${safeLink}">Restablecer mi contraseña</a>
      </p>

      <p>El enlace vence 15 minutos después de su creación
      y solo puede utilizarse una vez.</p>

      <p>Tu contraseña actual seguirá funcionando hasta
      que establezcás una nueva.</p>

      <p>No compartás este enlace. Si no solicitaste
      este cambio, podés ignorar el mensaje.</p>
    `
  );

  if (!result || result.success !== true) {
    throw new Error('No se pudo aceptar el correo de recuperación');
  }

  return { accepted: true };
}

module.exports = { sendRecoveryEmail };