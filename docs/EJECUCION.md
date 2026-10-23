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

## Base separada: creada y acceso por Terminal confirmado

El usuario confirmó mediante resultados de Terminal: MariaDB 10.4.28 en puerto 3306, base `lomas_eveneser_dev` con utf8mb4_unicode_ci, usuario `lomas_app_dev@localhost`, permisos SELECT/INSERT/UPDATE/DELETE y acceso TCP a 127.0.0.1. SHOW TABLES devolvió vacío. No se importó el respaldo anterior. La contraseña se restableció localmente; no se compartió con el agente.

### Comprobar desde Node

1. Abrir `lomas-backend/.env.lomas.local` en VS Code. Se preparó una plantilla local con permisos de archivo 600 y excluida de Git.
2. Reemplazar únicamente `CAMBIAR_SOLO_LOCALMENTE` por la contraseña del usuario **lomas_app_dev**, conservando las comillas dobles. Guardar. No usar la contraseña de root ni el .env anterior. Si la contraseña contiene comillas dobles o barras inversas, revisar su representación en dotenv localmente antes de continuar; nunca compartirla en el chat.
3. Desde la raíz del proyecto:

```sh
cd lomas-backend
npm run db:check
```

El script lee exclusivamente `.env.lomas.local`, sin cargar el .env heredado ni combinar variables de entorno. Solo admite host 127.0.0.1, puerto 3306, base lomas_eveneser_dev y usuario lomas_app_dev. Ejecuta un SELECT para comprobar base, cuenta y versión. Cierra la conexión y no crea tablas, modifica datos ni envía correos. El resultado esperado identifica la base nueva y lomas_app_dev@localhost.

En otra copia del proyecto, crear el archivo local a partir de `.env.lomas.example`. No subirlo a Git. `npm start` sigue en modo diagnóstico: no abre la BD ni habilita rutas heredadas. La conexión desde Node queda pendiente hasta que el usuario configure su contraseña local y ejecute db:check.

Diseñar migraciones ganaderas antes de crear tablas; se aplicarán con una cuenta administrativa separada, no ampliando permisos del usuario de la aplicación. El esquema database/legacy es solo referencia. Respaldos reales fuera de GitHub y con restauración verificada en otra base.
