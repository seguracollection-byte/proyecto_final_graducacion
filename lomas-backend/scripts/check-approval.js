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

  const idText = await input({
    message: 'ID de la solicitud pendiente:',
    validate: (value) =>
      (
        /^[1-9]\d*$/.test(value) &&
        Number(value) <= 4294967295
      ) || 'Ingresá un ID válido.',
  });

  const expectedEmail = await input({
    message: 'Correo esperado del destinatario:',
    validate: (value) =>
      Boolean(value.trim()) || 'Ingresá el correo esperado.',
  });

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
      item.id === Number(idText) &&
      item.email.toLowerCase() === expectedEmail.trim().toLowerCase() &&
      item.estado === 'pendiente'
  );

  if (!target) {
    console.log(
      'No se encontró una solicitud pendiente que coincida. No se aprobó nada.'
    );
    process.exitCode = 1;
    return;
  }

  console.log('Solicitud:', target.id);
  console.log('Destinatario:', target.email);

  const approved = await confirm({
    message:
      '¿Aprobar esta solicitud y enviar el correo real de activación?',
    default: false,
  });

  if (!approved) {
    console.log('Operación cancelada.');
    return;
  }

  const response = await fetch(
    `${base}/api/admin/solicitudes/${target.id}/aprobar`,
    {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(30000),
    }
  );

  const result = await response.json();

  console.log('Estado HTTP:', response.status);
  console.log({
    aprobada: result.aprobada === true,
    correoAceptado: result.correoAceptado === true,
  });
  console.log('Mensaje:', result.message);

  if (!response.ok || result.correoAceptado !== true) {
    process.exitCode = 1;
  }
}

main().catch(() => {
  console.error(
    'No se pudo confirmar el resultado. Revisá la solicitud y el correo antes de repetir.'
  );
  process.exitCode = 1;
});