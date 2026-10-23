# Ejecución segura

## Backend de diagnóstico

```sh
cd lomas-backend
npm start
```

Escucha exclusivamente en 127.0.0.1:3000. Consultar `http://127.0.0.1:3000/health`; devuelve status ok y BD/correo disabled. `/api/*` devuelve 503 deliberadamente. No requiere .env ni base. Ejecutar `npm test` para verificar el aislamiento. Ctrl+C detiene el servidor.

Se conservaron ambos package.json y package-lock.json; ya existían node_modules. Para reconstruir dependencias desde lock, revisar previamente scripts de instalación y usar `npm ci` en cada carpeta. Esta etapa no verificó una instalación limpia. No ejecutar npm audit fix --force.

## Frontend heredado

```sh
cd lomas-frontend
EXPO_OFFLINE=1 npx --no-install expo start --localhost --port 8082
```

El arranque local de Metro está comprobado; las pantallas siguen siendo de barbería y no están listas para un piloto. No utilizar cuentas anteriores. Para Expo Go físico hará falta LAN y una versión compatible; el backend actual sigue cerrado a loopback. En teléfono, localhost identifica el teléfono; Android Emulator usa normalmente 10.0.2.2 para acceder a la Mac. Tras implementar la API segura se configurará EXPO_PUBLIC_API_URL con la dirección adecuada. Nunca poner contraseñas ni JWT_SECRET en EXPO_PUBLIC_*.

`npx --no-install expo install --check` permite revisar compatibilidad; AsyncStorage requiere evaluar el ajuste puntual a 2.2.0. No aplicar cambios masivos. Para Xcode se aceptó la licencia manualmente por el usuario. Android Studio y Xcode están instalados, pero no se han ejecutado simuladores ni compilaciones nativas completas.

## Preparar la base separada (pendiente, no ejecutado)

1. Confirmar qué servidor local se usará. El cliente de XAMPP es MariaDB, aunque MySQL Workbench también está instalado; Workbench no demuestra que haya un servidor MySQL.
2. Desde una sesión administrativa local del servidor elegido ejecutar `SELECT VERSION();`. No usar ni copiar las credenciales de la barbería.
3. Crear exclusivamente una base nueva `lomas_eveneser_dev` con utf8mb4 y una cuenta nueva `lomas_app_dev` limitada a esa base. Generar su contraseña localmente. No conceder acceso global ni a barberia_db. Separar permisos de migración de los de ejecución cuando exista el esquema aprobado.
4. Registrar los valores en un archivo local nuevo a partir de .env.example. El .env heredado sigue excluido y NO se carga con el diagnóstico. No habilitar ENABLE_LEGACY_API ni importar el respaldo anterior.
5. Diseñar y revisar migraciones ganaderas antes de ejecutarlas; solo datos ficticios. El esquema en database/legacy es referencia histórica y no debe ejecutarse.

Todavía no hay operaciones de BD que probar: este arranque demuestra aislamiento, no conectividad. Los respaldos reales se almacenarán fuera del repositorio, con acceso restringido y una prueba de restauración en una base aparte; definir ubicación y periodicidad con el propietario.
