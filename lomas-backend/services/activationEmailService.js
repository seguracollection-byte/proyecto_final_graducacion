const { enviarCorreo } = require('./emailService');
const {
  buildActivationLink,
} = require('../config/accountLinks');

async function sendActivationEmail(email, token) {
  const link = buildActivationLink(token);

  // Protege el valor al incluirlo en HTML.
  const safeLink = link
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const result = await enviarCorreo(
    email,
    'Activá tu cuenta — Lomas Eveneser',
    `
      <h1>Lomas Eveneser</h1>
      <p>Tu solicitud de acceso fue aprobada.</p>
      <p>Para activar tu cuenta, establecé tu contraseña:</p>
      <p><a href="${safeLink}">Establecer mi contraseña</a></p>
      <p>El enlace vence 24 horas después de su creación
      y solo puede utilizarse una vez.</p>
      <p>No compartás este enlace. Si no solicitaste acceso,
      podés ignorar este mensaje.</p>
    `
  );

  if (!result || result.success !== true) {
    throw new Error('No se pudo aceptar el correo de activación');
  }

  return { accepted: true };
}

module.exports = { sendActivationEmail };