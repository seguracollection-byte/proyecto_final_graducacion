# Migraciones de Lomas

`001_acceso_usuarios.sql` define usuarios, solicitudes de acceso y tokens de cuenta. Ya fue aplicada en la base local de desarrollo. No volver a ejecutarla sobre las tablas existentes.

Los módulos ganaderos requieren nuevas migraciones numeradas. Aplicarlas con una cuenta administrativa separada; la cuenta de la aplicación conserva permisos de lectura y escritura de registros. No importar datos de barbería ni respaldos reales al repositorio.
