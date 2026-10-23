# Revisión puntual de dependencias — 23/10/2026

Se conservó Expo SDK 54, React 19.1 y React Native 0.81.5. No se ejecutó audit fix ni una actualización general. Se consultaron auditorías actuales y los rangos de dependencias antes de actuar. Se instalaron los paquetes con --ignore-scripts, sin scripts de instalación automáticos.

## Cambios y razones

| Paquete | Antes | Después | Motivo |
| --- | --- | --- | --- |
| AsyncStorage | 3.1.1 | 2.2.0 | Versión esperada por bundledNativeModules.json del Expo 54 instalado; fijada exacta para no volver a 3.x |
| Axios | 1.18.1 | 1.20.0 | Correcciones dentro de la misma versión mayor; versión exacta |
| shell-quote (frontend indirecta) | 1.9.0 | 1.12.0 | Aviso crítico; satisface el rango ^1.6.1 de react-devtools-core |
| mysql2 | 3.22.5 | 3.24.6 | Correcciones sin salto de versión mayor; versión exacta |
| proxy-addr (backend indirecta) | 2.0.7 | 2.0.8 | Corrige aviso crítico y satisface Express |
| qs (backend indirecta) | 6.15.3 | 6.16.1 | Correcciones dentro de rangos de Express/body-parser |
| brace-expansion (backend indirecta) | 5.0.6 | 5.0.12 | Correcciones dentro del rango de minimatch usado por nodemon |

Cambios transitivos adicionales revisados: iconv-lite 0.7.2 → 0.7.3, sql-escaper 1.3.3 → 1.5.2; AsyncStorage 2 incorpora merge-options/is-plain-obj y retira su dependencia incompatible anterior. package-lock registra exactamente el árbol obtenido.

## Resultado y alcance

| Auditoría npm | Antes | Después |
| --- | --- | --- |
| Backend | 5: 2 moderados, 2 altos, 1 crítico | 1 alto (Nodemailer) |
| Frontend | 27: 8 moderados, 18 altos, 1 crítico | 25: 8 moderados, 17 altos, 0 críticos |

Conteos de paquetes señalados, no de vulnerabilidades funcionales demostradas. Detalles y enlaces de avisos en AUDITORIA.json, conservando también la auditoría inicial. Los conteos pueden variar con nuevos avisos.

Nodemailer permanece instalado pero el servicio actual no lo importa y el correo está deshabilitado. La corrección completa propuesta sale de la versión mayor 9. Evaluar su actualización o retirada antes de implementar recuperación por correo; no habilitar SMTP con esta versión.

En frontend quedan avisos en dependencias de Expo/Metro, navegación y utilidades transitivas. Algunos podrían corregirse con actualizaciones puntuales adicionales; requieren seguir la cadena y probar por separado. Para Expo y datetimepicker, audit propone versiones antiguas incompatibles con la configuración actual (Expo 44 / datetimepicker 8.1.1): no aplicarlas automáticamente. No se fuerza un override ni un salto de SDK. Antes de piloto/distribución se debe resolver o justificar cada riesgo según uso y exposición. Metro solo en loopback durante esta fase.

## Verificación

- npm test backend: dos pruebas aprobadas, aislamiento de API y restricciones de configuración de BD.
- npm run db:check: SELECT a la base nueva con usuario exclusivo, aprobado con mysql2 actualizado. Sin escrituras ni correos.
- expo install --check offline: Dependencies are up to date; el propio comando advierte que la validación offline tiene límites. Se contrasta AsyncStorage con la tabla incluida en Expo y su documentación.
- Metro arrancó en loopback; bundles Android e iOS respondieron correctamente tras los cambios. Esto no demuestra ejecución nativa ni persistencia en teléfono.
- Faltan pruebas en dispositivos y una instalación limpia reproducible antes del piloto. La API heredada sigue cerrada.

## Para la defensa

AsyncStorage guarda datos locales en el dispositivo y no cifra su contenido; no será la fuente compartida ni el lugar para contraseñas. Axios hace peticiones HTTP desde las pantallas. mysql2 ejecuta consultas desde el servidor. Las dependencias indirectas vienen incluidas por otras bibliotecas y también requieren revisión. Una auditoría sin críticos no equivale a una aplicación segura: siguen pendientes autenticación y pruebas de autorización.

Fuentes: [Expo AsyncStorage](https://docs.expo.dev/versions/v54.0.0/sdk/async-storage/), [versiones de mysql2](https://github.com/sidorares/node-mysql2/releases), [avisos de shell-quote del mantenedor](https://github.com/ljharb/shell-quote/security/advisories). La compatibilidad concreta de SDK 54 se verificó además con node_modules/expo/bundledNativeModules.json.
