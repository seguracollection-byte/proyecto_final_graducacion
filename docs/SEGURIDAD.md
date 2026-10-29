# Seguridad y repositorio

El repositorio final autorizado es https://github.com/seguracollection-byte/proyecto_final_graducacion.git. La consulta git ls-remote autenticada por las herramientas locales terminó correctamente sin referencias: remoto vacío al momento de revisión. No se debe hacer force push.

Los historiales heredados contienen credenciales y referencias a datos personales. Se detiene su envío: no se fusionan, empujan ni copian sus objetos al nuevo repositorio. Sus carpetas .git se conservan en .local-backup, junto a copias de los archivos sensibles sustituidos. Esta carpeta y el respaldo SQL siguen solo localmente. No compartir ni sincronizar esa carpeta. El proyecto anterior fuera de este directorio no fue tocado.

Rotar la contraseña del usuario de BD de la barbería y revocar/reemplazar la contraseña de aplicación SMTP. Revisar y rotar cualquier secreto JWT real reutilizado del .env anterior; el respaldo fijo del código ya se retiró. No se afirma que la rotación se haya efectuado. El propietario debe coordinarla para no interrumpir su aplicación original. Si esos historiales ya fueron publicados, la rotación es prioritaria; sanearlos requiere un trabajo separado con sus colaboradores, no un force push desde este proyecto.

.gitignore excluye dependencias, .env/variantes, logs, assets generados, credenciales y SQL con filas. Solo permite explícitamente schema histórico y migraciones revisadas. Los package-lock se conservan. Las reglas de exclusión no eliminan secretos ya rastreados: por eso el proyecto final comienza con historial nuevo revisado.

Antes de cada commit revisar archivos staged, buscar secretos y datos personales y revisar el diff. Un escáner por patrones puede tener falsos negativos. No incluir .git heredados, respaldos ni datos reales. GitHub puede usar autenticación de macOS/browser; si falla, configurar un gestor de credenciales o GitHub CLI con login en navegador. Nunca pegar tokens/contraseñas en el chat ni incluirlos en URLs.

El diagnóstico usa HTTP solo en loopback. Antes de abrir acceso por LAN o desplegar, reparar autenticación, evaluar dependencias, configurar orígenes y HTTPS. No se autorizó despliegue ni correos reales. Backups de la finca se administran aparte de GitHub.

## Estado de seguridad — entrega 3

Se incorporó MFA obligatorio antes de emitir sesión, biometría con prueba de clave
vinculada y códigos de recuperación de un uso. Ver [MFA.md](MFA.md) para restricciones,
modelo de amenazas y límites. La API ya no muestra `X-Powered-By`, devuelve errores
JSON genéricos para cuerpos inválidos/grandes y marca las respuestas API `no-store`.

Auditoría del 29/10/2026: backend 0 avisos; frontend 10 bajos, 0 altos/moderados/críticos.
La dependencia indirecta deepmerge sigue pendiente. Esto no garantiza ausencia de
vulnerabilidades; detalles y evidencia en [DEPENDENCIAS.md](DEPENDENCIAS.md).
