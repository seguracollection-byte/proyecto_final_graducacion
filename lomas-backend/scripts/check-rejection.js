async function main() {
  const { input, password, confirm } = await import(
    '@inquirer/prompts'
  );

  const base = 'http://127.0.0.1:3000';

  const email = await input({
    message: 'Correo del administrador:',
  });

  const clave = await password({
    message: 'Contraseña de la aplicación:',
    mask: '*',
  });

  const loginResponse = await fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim(),
      password: clave,
    }),
    signal: AbortSignal.timeout(15000),
  });

  const login = await loginResponse.json();

  if (
    !loginResponse.ok ||
    typeof login.token !== 'string' ||
    login.user?.rol !== 'administrador'
  ) {
    throw new Error('No se obtuvo una sesión administradora');
  }

  const headers = {
    Authorization: `Bearer ${login.token}`,
  };

  const listResponse = await fetch(
    `${base}/api/admin/solicitudes`,
    {
      headers,
      signal: AbortSignal.timeout(15000),
    }
  );

  const list = await listResponse.json();

  if (!listResponse.ok || !Array.isArray(list.solicitudes)) {
    throw new Error('No se pudo consultar el listado');
  }

  const target = list.solicitudes.find(
    (item) =>
      item.id === 3 &&
      item.email === 'permisos.prueba@example.com' &&
      item.estado === 'pendiente'
  );

  if (!target) {
    throw new Error('La solicitud ficticia esperada no está pendiente');
  }

  const approved = await confirm({
    message: '¿Rechazar la solicitud ficticia 3: Prueba Permisos?',
    default: false,
  });

  if (!approved) {
    console.log('Operación cancelada.');
    return;
  }

  const response = await fetch(
    `${base}/api/admin/solicitudes/3/rechazar`,
    {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(15000),
    }
  );

  const result = await response.json();

  console.log('Estado del rechazo:', response.status);
  console.log('Mensaje:', result.message);

  if (!response.ok) {
    process.exitCode = 1;
  }
}

main().catch(() => {
  console.error(
    'No se completó la prueba. Revisá el estado de la solicitud antes de repetir.'
  );
  process.exitCode = 1;
});