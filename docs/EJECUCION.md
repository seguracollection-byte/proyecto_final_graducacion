# Ejecución local de Lomas Eveneser

## Backend

```sh
cd lomas-backend
npm run dev
```

Escucha en `0.0.0.0:3000` para las pruebas en la red local. Desde la Mac se accede por `127.0.0.1:3000`. `GET /health` comprueba que responde; no consulta la base ni verifica SMTP. El campo `email: disabled` de esa respuesta es informativo y fijo: la configuración efectiva de envío se lee de `.env.lomas.local`.

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

## Android e iPhone físicos

Ambos dispositivos y la Mac deben estar en la misma Wi-Fi. El backend y
Metro deben permanecer encendidos. Verificar la IP de la Mac antes de arrancar;
`192.168.100.200` fue la dirección usada en estas pruebas y puede cambiar.

```sh
cd lomas-frontend
EXPO_PUBLIC_API_URL=http://192.168.100.200:3000/api npx --no-install expo start --lan --port 8082 --clear
```

Comprobar desde el navegador del teléfono `http://192.168.100.200:3000/health`.
MySQL conserva su host `127.0.0.1`: no se expone la base al teléfono.

Android usa Expo Go compatible con SDK 54. Gesture Handler está fijado en
`~2.28.0`, compatible con este SDK. No actualizar a la versión mayor 3.

El iPhone usa una compilación propia desde Xcode, no Expo Go 58. El proyecto
nativo está versionado en `lomas-frontend/ios`. Conectar el iPhone, habilitar
modo desarrollador y configurar una cuenta Apple propia en Signing & Capabilities.
Confiar en el desarrollador desde el teléfono y permitir red local.

```sh
cd lomas-frontend/ios
pod install
open lomasfrontend.xcworkspace
```

Seleccionar el iPhone y ejecutar con Command+R. La firma Personal Team de prueba
requiere renovación periódica; no constituye distribución permanente.
No compartir certificados ni perfiles de firma. `.xcode.env.local`, Pods,
DerivedData y datos personales de Xcode no se versionan.

Ajustes nativos conservados para Xcode 27/iOS 27:
- Podfile aplica como mínimo iOS 15.1 y resuelve el valor recomendado de Xcode.
- Info.plist declara UIScene y AppDelegate inicia la ventana desde SceneDelegate.
- LomasMetroHost en Info.plist define `192.168.100.200:8082` solo para el arranque DEBUG;
  actualizarlo y recompilar si cambia la IP de la Mac.
- Ícono de la finca y nombre visible Lomas Eveneser.

No ejecutar prebuild --clean: regenerar ios puede sobrescribir estos ajustes
manuales. Los cambios JavaScript se reciben desde Metro por Wi-Fi sin recompilar;
los cambios nativos requieren nueva compilación. El usuario confirmó que el
icono abre la app sin cable mientras los servidores de la Mac siguen disponibles.

## Límites actuales

Los enlaces de cuenta aún apuntan a localhost y su configuración solo admite
localhost/127.0.0.1:8082. Su flujo nativo desde correo no está adaptado todavía.
La configuración de la red actual es de desarrollo: no exponer puertos del router.
No hay backend público HTTPS, funcionamiento sin Internet ni distribución de producción.

Las migraciones de acceso ya fueron aplicadas; no repetir la migración inicial.
Los módulos ganaderos tendrán migraciones nuevas. Datos y respaldos quedan fuera de Git.

## Entrega 3

Al instalar frontend con `npm install`/`npm ci`, `postinstall` aplica la adaptación de
Metro para el parser de imágenes corregido. Si se usa `--ignore-scripts`, ejecutar
`node scripts/patch-metro-assets.js` desde `lomas-frontend` antes de arrancar Expo.
No regenerar iOS con `prebuild --clean`: hay ajustes nativos de UIScene preservados.
Face ID/huella requieren la app nativa; Expo Go permite Authenticator y recuperación.
Las migraciones 002 y 003 ya se aplicaron en esta máquina. Documentación [MFA](MFA.md).
