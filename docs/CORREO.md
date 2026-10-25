# Correo de Lomas Eveneser

Se configuró Gmail mediante una contraseña de aplicación guardada
exclusivamente en .env.lomas.local, fuera de Git.

## Comprobaciones realizadas

- Lectura de configuración sin mostrar la credencial.
- Conexión y autenticación SMTP correctas.
- Envío real de prueba recibido en la bandeja de entrada.
- Dos pruebas del backend aprobadas.
- Nodemailer actualizado a 10.2.1.
- body-parser actualizado a 2.4.0.
- npm audit no reportó vulnerabilidades del backend en esa revisión.

## Límites actuales

El envío básico funciona. Todavía no están implementados los flujos
de aprobación de solicitudes ni recuperación mediante enlaces
de un solo uso con vencimiento.

EMAIL_ENABLED permanece en false al terminar las pruebas.
No ejecutar scripts de envío automáticamente durante npm test.
Una auditoría sin avisos no garantiza ausencia de vulnerabilidades.