# Segundo factor de autenticación — Lomas Eveneser

## Función principal y explicación para la clase

El objetivo del 2FA es que conocer la contraseña no baste para entrar. Primero se
comprueba algo que la persona sabe —su contraseña— y después una prueba adicional.
Lomas emite la sesión completa solo al completar ambas etapas.

Con Authenticator, la persona demuestra que posee el secreto configurado en su
aplicación. TOTP calcula códigos a partir de ese secreto y del tiempo. En Lomas son
seis dígitos y períodos de 30 segundos, con tolerancia de un período a cada lado
para diferencias de reloj. El servidor rechaza períodos ya utilizados.
La implementación se basa en [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238).

Con biometría, Face ID o la huella autoriza localmente el uso de una clave privada
que firma un desafío aleatorio del servidor. El servidor verifica la firma con la
clave pública previamente vinculada. La huella y el rostro no se envían a Lomas.
La prueba remota es posesión de esa clave; la biometría protege su uso local.
No se implementó atestación remota del hardware: verificar una firma no permite al
servidor certificar por sí solo que hubo lectura biométrica en un cliente modificado.

## Flujo implementado

1. `POST /api/login` valida correo, contraseña y cuenta activa.
2. Devuelve HTTP 202 con un permiso opaco de cinco minutos; **no devuelve JWT**.
3. Si la cuenta es nueva, se configura Authenticator y se confirma un código.
4. En ingresos posteriores se elige Authenticator, biometría vinculada o un código
   de recuperación. La contraseña sigue siendo obligatoria con cualquiera.
5. El servidor consume el permiso y entrega un JWT con `mfa: true` y
   `amr: ['pwd', 'otp' | 'biometric' | 'recovery']`.
6. La aplicación entra directamente a Home. Solo en la primera configuración se
   detiene para guardar los diez códigos de recuperación.

Las sesiones ya abiertas se restauran verificando su JWT y la cuenta actual en el
backend; no se solicita biometría en cada apertura mientras la sesión siga válida.
El JWT dura una hora. Cambiar la contraseña invalida las versiones de sesión previas.

## Códigos de recuperación

Se generan diez códigos aleatorios de 128 bits al configurar Authenticator. Se
muestran una sola vez. La base guarda únicamente sus hashes SHA-256.

Para usarlos: iniciar sesión con correo y contraseña → **Usar un código de
recuperación** → escribir uno completo → **Verificar código**. Se acepta el formato
con guiones o 32 caracteres hexadecimales sin guiones, sin distinguir mayúsculas.
Después del ingreso ese código queda gastado, sin cambiar Authenticator ni los otros
códigos. No se acepta para saltar la configuración inicial del segundo factor.

El servicio bloquea la fila de usuario dentro de una transacción, comprueba cuenta
activa, versión de sesión, propósito, vencimiento e intentos del permiso y que el
código pertenezca a la misma cuenta y no esté usado. Marca el código consumido e
invalida los desafíos pendientes en la misma transacción. Dos solicitudes
simultáneas no pueden usarlo dos veces. Código erróneo consume un intento; al llegar
a cinco se bloquea ese permiso. También aplica el límite HTTP compartido de MFA.

Guardar los códigos fuera del teléfono autenticador, en un lugar privado. No
incluirlos en Git, capturas públicas ni correos. Aún no hay regeneración de códigos
ni restablecimiento administrativo del segundo factor: no perder todas las vías.
Recuperar la contraseña por correo **no elimina** el segundo factor.

## Endpoints

| Método y ruta | Permiso requerido |
| --- | --- |
| POST `/api/mfa/configurar` | Desafío de configuración tras contraseña |
| POST `/api/mfa/verificar` | Desafío MFA y código TOTP |
| POST `/api/mfa/recuperacion` | Desafío de verificación y código de recuperación |
| POST `/api/biometria/dispositivos/registrar` | JWT de una sesión que completó MFA |
| POST `/api/biometria/dispositivos/confirmar` | Mismo JWT y firma del desafío de registro |
| POST `/api/biometria/ingreso/desafio` | Desafío MFA tras contraseña y dispositivo vinculado |
| POST `/api/biometria/ingreso/verificar` | Desafío biométrico y firma válida |

## Almacenamiento y límites

- Migraciones `002_mfa.sql` y `003_biometria.sql`, aplicadas con root por el usuario.
  El usuario normal de la aplicación conserva permisos de datos, sin crear tablas.
  Ya están aplicadas en esta Mac: no volver a ejecutarlas aquí.
- Secreto TOTP cifrado con AES-256-GCM, IV aleatorio y detección de alteraciones.
  `MFA_ENCRYPTION_KEY` permanece únicamente en `.env.lomas.local`, ignorado por Git.
  Respaldar esa clave por un canal privado; perderla impide descifrar los secretos.
- Desafíos opacos aleatorios: base guarda hashes. Desafíos biométricos duran como
  máximo dos minutos y nunca superan la vigencia del permiso de login.
- RSA 2048 / SHA-256 para firmas, clave pública con formato y tamaño validados,
  dispositivo activo y propiedad de cuenta comprobada; sin respaldo por PIN en
  el diálogo biométrico. Máximo diez dispositivos activos por cuenta.
- JWT nativo en SecureStore, web en memoria; AsyncStorage solo para correos y
  referencias públicas del dispositivo. No guarda contraseñas ni claves privadas.
- API con consultas parametrizadas, errores sin trazas internas y `Cache-Control:
  no-store`. Límite MFA HTTP de 30 intentos por IP cada 15 minutos, compartido con
  biometría. Es memoria de un proceso, no un limitador distribuido.
- Las pruebas actuales usan HTTP en Wi-Fi local. Antes de Internet se necesita
  HTTPS, alojamiento del backend/BD, configuración de dominios y enlaces de correo,
  y revisar la distribución y firma de las aplicaciones. CORS no reemplaza MFA.

## Dispositivos y validación

El usuario confirmó Face ID en iPhone con compilación nativa, huella en Android con
compilación nativa y TOTP en Fire mediante Expo Go SDK 54 y Authenticator en otro
teléfono. Una tablet sin biometría no muestra esa opción. No es necesario que
Authenticator esté instalado en el mismo dispositivo que ejecuta Lomas.

Pruebas automatizadas cubren cifrado/firma, desafíos, registro/confirmación de
claves, TOTP, sesiones y consumo de códigos de recuperación. Una prueba aislada
contra MariaDB y HTTP verificó ingreso y sesión 200, una sola aceptación entre dos
solicitudes concurrentes, rechazo de reutilización 400 e intento registrado; su
cuenta temporal y datos fueron eliminados. La UI nueva se comprobó en Chrome con
API simulada, en tamaño móvil y escritorio, sin cuentas reales ni envío de correos.
La nueva UI y recuperación quedan para confirmación manual final en los teléfonos.
