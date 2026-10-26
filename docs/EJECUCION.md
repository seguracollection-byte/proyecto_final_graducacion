# Ejecución local de Lomas Eveneser

## Backend

```sh
cd lomas-backend
npm run dev
```

Escucha en `127.0.0.1:3000`. `GET /health` comprueba que responde; no consulta la base ni verifica SMTP. El campo `email: disabled` de esa respuesta es informativo y fijo: la configuración efectiva de envío se lee de `.env.lomas.local`.

Las rutas de acceso y cuentas están documentadas en [ACCESO.md](ACCESO.md). Las rutas inexistentes, incluidas las de barbería retiradas, devuelven 404. Ctrl+C detiene el servidor.

```sh
npm test
npm run db:check
```

La comprobación de base solo lee el nombre, la cuenta y la versión del servidor. La aplicación usa MariaDB de XAMPP en `127.0.0.1:3306`, base `lomas_eveneser_dev`, cuenta `lomas_app_dev`. MySQL debe estar iniciado.

## Frontend web

```sh
cd lomas-frontend
npx --no-install expo start --web --localhost --port 8082
```

Abrir `http://localhost:8082`. Las pantallas activas son las de Lomas. Login, solicitud de acceso, aprobación, rechazo, activación, reenvío y recuperación fueron comprobados en navegador con cuentas controladas. Los módulos ganaderos aún muestran su estado pendiente.

## Configuración local

La configuración privada del backend está en `.env.lomas.local`, excluida de Git. `.env.lomas.example` sirve como plantilla; nunca utilizar root como cuenta de la aplicación. No compartir contraseñas, tokens ni enlaces de cuenta.

`EMAIL_ENABLED=true` habilita correos reales. Activación usa `ACTIVATION_PAGE_URL=http://localhost:8082/activar` y recuperación usa `RECOVERY_PAGE_URL=http://localhost:8082/restablecer`. Los enlaces locales se abren en la Mac que ejecuta el proyecto.

Para reconstruir dependencias, usar `npm ci` en cada carpeta. No ejecutar `npm audit fix --force`; revisar los avisos pendientes en [DEPENDENCIAS.md](DEPENDENCIAS.md).

## Pruebas en dispositivos

Pendientes de configurar y comprobar. Probar cada bloque funcional en un teléfono y hacer una prueba completa antes de entregar. En un teléfono, localhost identifica al propio teléfono: el backend, el API público y los enlaces deben configurarse para una dirección accesible. La configuración actual está limitada a la Mac. No incluir secretos en variables `EXPO_PUBLIC_*`.

Las migraciones de acceso ya fueron aplicadas. No volver a ejecutar la migración inicial sobre tablas existentes. Los módulos ganaderos tendrán migraciones nuevas; respaldos y datos reales permanecen fuera de Git.
