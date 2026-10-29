# Entrega 3 — 29 de octubre de 2026

Rama: `entrega-3`, creada desde `entrega-2`, conservando su historial. Incluye el
avance completo de frontend, backend, migraciones y fuentes nativas Android/iOS.

## Cambios

- Login obligatorio en dos etapas: contraseña y segundo factor antes de emitir JWT.
- Google Authenticator/TOTP, secreto cifrado, desafíos temporales y control de intentos.
- Face ID y huella con claves del dispositivo y verificación de firmas en el backend.
- Registro y confirmación de dispositivos después de una sesión con MFA.
- Diez códigos de recuperación: emisión inicial y consumo individual de un solo uso.
- Ingreso directo a Home después del segundo factor, sin pantalla intermedia habitual.
- Home organizado, iconos minimalistas y tarjetas adaptables; engranaje junto al nombre.
- Pantalla Mi cuenta con datos, acceso a biometría y solicitud de cambio de contraseña.
- Diseño de login conservado; Recuérdame sin lista visible de correos.
- Proyecto Android nativo y dependencia biométrica de iOS; Fire admite TOTP con Expo Go.
- Corrección de vulnerabilidades altas/moderadas en herramientas de frontend, sin
  migrar SDK 54. Diez avisos bajos pendientes documentados; backend sin avisos npm.
- Errores API sin trazas internas y respuestas de API no almacenables en caché.

## Validación

- Suite del backend: 25 pruebas aprobadas en el cierre de esta entrega.
- Exportación de bundles Android, iOS y web completada con las dependencias corregidas.
- Prueba integrada MariaDB/HTTP de recuperación, simultaneidad y rechazo de reuso.
- UI en Chrome: login simulado, recuperación, entrada directa a Home, engranaje,
  pantalla Mi cuenta y regreso, tamaños 375×667 y escritorio; sin errores JavaScript.
- Usuario confirmó previamente Face ID en iPhone físico, huella en Android físico
  y acceso con Authenticator en Fire. Los últimos cambios de UI/códigos requieren
  su comprobación final en esos dispositivos; no se atribuye una prueba física nueva.

## Para retomar o presentar

1. Backend y Metro permanecen activos. Recargar Lomas para ver la nueva pantalla.
2. Entrar con contraseña y segundo factor. El engranaje abre Mi cuenta.
3. Para demostrar recuperación, usar uno de los códigos guardados: se gastará;
   reutilizarlo en un nuevo login debe ser rechazado.
4. No hace falta reconstruir las apps nativas por estos últimos cambios de JavaScript.

## Alcance del respaldo

Git conserva código, fuentes nativas, iconos, lockfiles, pruebas y documentos.
**No es un respaldo de los registros de MariaDB ni de secretos locales.** `.env`,
claves personales, certificados, `local.properties`, Pods, node_modules y compilados
permanecen fuera del repositorio. El keystore debug Android estándar es únicamente
para desarrollo; no usar esa firma para producción. No se publica APK de producción.

Módulos ganaderos, despliegue público HTTPS, tiendas, atestación remota y gestión
completa de factores perdidos siguen pendientes. Detalles en [MFA.md](MFA.md) y
[DEPENDENCIAS.md](DEPENDENCIAS.md).
