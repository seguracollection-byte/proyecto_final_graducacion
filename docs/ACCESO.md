# Acceso privado de Lomas Eveneser

## Decisiones

- Solo Carlos Guillermo y Hernán serán administradores.
- Crear cuenta inicia una solicitud sin acceso habilitado.
- Un administrador aprueba o rechaza la solicitud.
- La aprobación permitirá enviar un enlace de activación.
- Activación y recuperación usarán tokens de un solo uso
  con vencimiento; en la base se guardará únicamente su hash.

## Base de desarrollo comprobada

Se aplicó 001_acceso_usuarios.sql en lomas_eveneser_dev.
Se crearon usuarios, solicitudes_acceso y tokens_cuenta.
La cuenta lomas_app_dev@localhost pudo consultar las tres.
Todas estaban vacías al terminar esta comprobación.

El acceso se comprobó mediante el socket local de XAMPP.
Falta resolver y comprobar nuevamente la conexión TCP
utilizada actualmente por el backend.

No volver a ejecutar esta migración sobre las tablas creadas.
Todavía no se implementaron los flujos de autenticación.

## Solicitud pública de acceso

Implementada POST /api/solicitudes-acceso.

Orden de procesamiento:
limitador por IP → validación → controlador → base de datos.

Pruebas manuales realizadas:
- Datos inválidos: respuesta 400.
- Datos válidos: respuesta 202 y solicitud pendiente.
- Correo duplicado: conserva una sola solicitud sin modificarla.
- Rol y estado manipulados: no conceden permisos.
- Solicitar acceso no crea usuarios ni tokens.
- Superar cinco intentos en 15 minutos: respuesta 429.

Pruebas automatizadas:
- Restricciones de configuración de la base.
- Respuesta de health y bloqueo de rutas heredadas.
- Datos inválidos rechazados sin solicitar el pool.
- Dos pruebas aprobadas.

El limitador guarda contadores en memoria y se reinicia con el servidor.
Todavía no están implementados login, aprobación ni activación.