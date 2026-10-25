async function main() {
  const { input, password } = await import('@inquirer/prompts');

  const email = await input({
    message: 'Correo de la aplicación:',
  });

  const clave = await password({
    message: 'Contraseña de la aplicación:',
    mask: '*',
  });

  const response = await fetch('http://127.0.0.1:3000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim(),
      password: clave,
    }),
    signal: AbortSignal.timeout(15000),
  });

  const result = await response.json();

  console.log('Estado del login:', response.status);

  if (!response.ok) {
    console.log('No se completó el inicio de sesión.');
    process.exitCode = 1;
    return;
  }

  if (typeof result.token !== 'string' || !result.token) {
    throw new Error('No se recibió un token');
  }

  console.log({
    accesoCorrecto: result.success === true,
    tokenRecibido: true,
    rol: result.user?.rol,
  });

  const sessionResponse = await fetch(
    'http://127.0.0.1:3000/api/sesion/me',
    {
      headers: {
        Authorization: `Bearer ${result.token}`,
      },
      signal: AbortSignal.timeout(15000),
    }
  );

  const session = await sessionResponse.json();

  console.log('Estado de ruta protegida:', sessionResponse.status);

  if (!sessionResponse.ok) {
    console.log('La ruta protegida rechazó la sesión.');
    process.exitCode = 1;
    return;
  }

  const sameAccount = session.user?.id === result.user?.id;

  console.log({
    sesionValida: session.success === true,
    mismaCuenta: sameAccount,
    rolActual: session.user?.rol,
  });

  if (session.success !== true || !sameAccount) {
    process.exitCode = 1;
  }
}

main().catch(() => {
  console.error('Prueba cancelada o no se pudo completar la conexión.');
  process.exitCode = 1;
});