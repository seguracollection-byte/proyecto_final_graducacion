# Entrega 2 — 27 de octubre de 2026

Rama: `entrega-2`. Estado preparado el 26 de octubre de 2026.

## Alcance de la entrega

- Login y sesión con roles administrador/usuario.
- Solicitud de acceso, aprobación, rechazo y activación por correo real.
- Recuperación de contraseña y reenvío de activación con tokens de un solo uso.
- Correos recordados en el dispositivo, sin guardar contraseñas.
- Ojito minimalista con ocultamiento automático a los 3 segundos.
- Tema negro, dorado y blanco, textos centrados y scroll corregido.
- Eliminación del código de barbería que ya no se utiliza.
- Configuración LAN del backend y Expo para pruebas físicas.
- Compatibilidad de Gesture Handler con SDK 54.
- Proyecto iOS, ajustes de Pods y UIScene para Xcode 27, conexión Metro de desarrollo,
  firma configurada localmente, nombre e ícono de Lomas.
- Corrección del acceso a user nulo durante cierre de sesión en Android.

La rama contiene una fotografía completa del proyecto; parte del bloque de acceso
ya estaba guardado en commits anteriores heredados de main. No se duplicó ni
reescribió ese historial para crear esta entrega.

## Validación

- 15 pruebas automatizadas del backend aprobadas durante el cierre del acceso
  y después de la limpieza.
- Usuario confirmó login, logout, scroll, teclado, ojito y navegación de registro
  en Android e iPhone físicos, y funcionamiento en web en la Mac.
- Usuario confirmó iPhone sin cable en la misma Wi-Fi que la Mac.
- Correo real: recuperación rechaza contraseña anterior y enlace consumido;
  reenvío invalida enlace anterior, activa con el nuevo y retira la cuenta del listado.
  Esos flujos se verificaron previamente en navegador con cuentas controladas.
- Almacenamiento de correos: revisión con simulación de guardado, normalización,
  varios correos sin duplicados y borrado; comprobación final de Recuérdame en
  ambos dispositivos queda pendiente de confirmación explícita.

## Límites y siguiente trabajo

Módulos ganaderos pendientes. Sin servidor público HTTPS, sin pruebas de Fire tablet,
sin APK de producción, sin publicación en tiendas y sin funcionamiento offline.
Los enlaces localhost de correo todavía requieren adaptación para uso nativo remoto.
La firma iOS gratuita y la IP de Metro son configuraciones de desarrollo.
Persisten advertencias de dependencias/Xcode, sin considerarlas resueltas por compilar.

La demostración y requisitos académicos finales los prepara el estudiante.
No se incluyen datos reales, claves, contraseñas, tokens ni perfiles de firma en Git.
