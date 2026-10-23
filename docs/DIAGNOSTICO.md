# Diagnóstico — 23 de octubre de 2026

No se encontraron AGENTS.md en el proyecto ni en los directorios ascendentes revisados. Había dos repositorios internos, ambos con remoto hacia cuarta_1_proyecto_final. Se preservan los historiales localmente, sin publicarlos. No se modificó la carpeta original externa a esta copia. Git inicialmente quedó bloqueado por la licencia de Xcode; el usuario confirmó su aceptación y Git se habilitó.

## Entorno comprobado

| Herramienta | Resultado |
| --- | --- |
| Node/npm | 24.17.0 / 11.13.0 |
| Expo instalado | 54.0.35; package.json solicita ~54.0.34 |
| React Native/React | 0.81.5 / 19.1.0 |
| Express/mysql2 | 5.2.1 / 3.22.5 |
| Xcode | 27.1, build 27A9275 |
| Android Studio | Aplicación instalada; JBR OpenJDK 21.0.10 |
| Android SDK/adb | SDK presente; adb 1.0.41, plataforma 35.0.2 |
| Base de datos | Cliente XAMPP MariaDB 10.4.28 x86_64; servidor activo y versión efectiva pendientes |
| VS Code | Aplicación instalada; no se comprobó su operación interactiva |
| Git | 2.54.0; GitHub CLI no instalado |

Expo SDK 54 corresponde a RN 0.81, React 19.1 y mínimo Node 20.19.x según https://docs.expo.dev/versions/v54.0.0/. Node local supera el mínimo; esto no garantiza compatibilidad completa. La comprobación offline de Expo detectó AsyncStorage 3.1.1 frente a 2.2.0 esperado. No se cambió la dependencia en esta etapa.

## Hallazgos verificados

- Credenciales de BD y SMTP incrustadas, también en el historial. .env y respaldo con filas estaban versionados en backend. Rotación pendiente, sin reproducir valores.
- update-password recibía id y password sin autenticar al solicitante. Registro aceptaba rol del cliente.
- JWT se emitía con secreto de respaldo fijo; no se encontró jwt.verify protegiendo rutas. Validadores existentes no se aplicaban a autenticación.
- Recuperación actualizaba la contraseña antes del envío de correo, sin token de un solo uso y vencimiento.
- LoginScreen decide administración por texto del correo y usa id/nombre de respaldo; imprime la respuesta de login, incluido el token.
- App.js registra pantallas públicas y privadas juntas. Registro e invitado siguen presentes en la interfaz heredada, sin API habilitada.
- AgendarCitaScreen usa div/input; AdminDashboard usa window.print; LoginScreen usa 100vh. No son una implementación nativa validada.
- AdminDashboard y AgendarCitaScreen contienen datos de ejemplo ante fallas/vacíos. Canjes y puntos compartidos se guardan en AsyncStorage.
- API apuntaba a localhost; ahora permite EXPO_PUBLIC_API_URL, cuyo valor es público y no debe contener secretos.
- app.json referenciaba assets ausentes; se retiraron esas referencias.
- No había pruebas útiles: el script test heredado fallaba intencionalmente. No hay migraciones ganaderas.

## Cambios y pruebas

Backend ahora expone únicamente /health en loopback; /api responde 503. No importa los routers heredados, el pool ni el servicio de correo. Revisión de rutas/controladores: no se identificaron tareas programadas de inicio; sí envíos al registrar citas o recuperar acceso, ahora inaccesibles. Servicio de correo sustituido por implementación deshabilitada. Configuración de BD sin credenciales incrustadas, restringida al nombre lomas_eveneser_dev, sin carga automática del .env anterior. Eliminado secreto JWT fijo. Las vulnerabilidades funcionales heredadas quedan pendientes; no habilitar sus rutas.

Prueba node --test: 1 prueba aprobada, verificando ausencia de importaciones BD/correo, health y bloqueo de cinco rutas heredadas. La primera ejecución en sandbox falló por EPERM al abrir puerto; se repitió autorizada y pasó.

Metro arrancó en localhost:8082. Se solicitaron bundles Android e iOS y ambos devolvieron HTTP satisfactorio. Esto comprueba empaquetado JavaScript, no ejecución en dispositivos ni compatibilidad de componentes nativos. Expo Go del teléfono no se inspeccionó: comprobar su compatibilidad con SDK 54 antes de probar. No se enviaron correos ni se abrió una conexión a la BD.

Auditoría npm del 23/10/2026: backend 5 dependencias con avisos (2 moderados, 2 altos, 1 crítico); frontend 27 (8 moderados, 18 altos, 1 crítico). Son resultados del árbol de dependencias y requieren evaluación de alcance; no equivalen a 32 fallas explotables comprobadas. Sin audit fix ni actualizaciones masivas. Los informes resumidos quedan en docs/AUDITORIA.json.

## Límites

Faltan servidor de desarrollo separado, cuenta con privilegios mínimos, pruebas funcionales Android/iOS, autenticación segura, resolución de compatibilidad y evaluación de avisos. No es todavía una aplicación ganadera utilizable. No se promete ausencia de vulnerabilidades.

## Organización de carpetas

A solicitud del usuario, las carpetas se renombraron a `lomas-frontend` y `lomas-backend`, junto con los nombres de paquetes, el nombre/slug de Expo y las instrucciones de ejecución. Los respaldos locales conservan sus nombres históricos.

## Avance de base de desarrollo

El 23/10/2026 el usuario confirmó con capturas la versión efectiva MariaDB 10.4.28, puerto 3306, creación de lomas_eveneser_dev (utf8mb4_unicode_ci), cuenta lomas_app_dev@localhost y sus cuatro permisos de datos. Acceso TCP confirmado y base sin tablas. Esto resuelve los pendientes de identificación del servidor y creación de la base señalados en el diagnóstico inicial.

Se agregó npm run db:check, consulta de solo lectura con configuración exclusiva .env.lomas.local, sin usar credenciales anteriores. Dos pruebas automatizadas aprobadas: aislamiento de rutas y rechazo de configuraciones de BD ajenas. Prueba real desde Node aprobada el 23/10/2026 tras configurar el usuario su contraseña localmente: base lomas_eveneser_dev, cuenta lomas_app_dev@localhost y versión 10.4.28-MariaDB. El intento dentro del sandbox falló; la repetición con acceso local autorizado pasó. No se modificaron datos ni se enviaron correos. No se habilitó la API heredada.

## Revisión posterior de dependencias

AsyncStorage ajustado a 2.2.0 y Axios a 1.20.0. mysql2 actualizado a 3.24.6 y correcciones puntuales en shell-quote, proxy-addr, qs y brace-expansion. Dos pruebas backend y conexión MariaDB aprobadas; validación offline Expo sin incompatibilidades y bundles Android/iOS compilados. Auditoría posterior: backend 1 alto, frontend 25 (8 moderados y 17 altos), sin críticos reportados. Quedan pendientes documentados en DEPENDENCIAS.md; no se aplicó actualización general ni cambio de SDK.
