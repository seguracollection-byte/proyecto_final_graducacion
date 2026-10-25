const bcrypt = require('bcryptjs');
const {
  getLomasPool,
  closeLomasPool,
} = require('../config/lomasDatabase');

async function main() {
  let connection;
  let locked = false;

  try {
    const { input, password, confirm } = await import(
      '@inquirer/prompts'
    );

    const nombre = await input({
      message: 'Nombre del administrador:',
      validate: (value) => {
        const length = value.trim().length;
        return (
          (length >= 2 && length <= 120) ||
          'Ingresá entre 2 y 120 caracteres.'
        );
      },
    });

    const email = await input({
      message: 'Correo del administrador:',
      validate: (value) =>
        (
          value.trim().length <= 254 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
        ) || 'Ingresá un correo válido.',
    });

    const clave = await password({
      message: 'Contraseña nueva de la aplicación:',
      mask: '*',
      validate: (value) =>
        (
          Array.from(value).length >= 12 &&
          Buffer.byteLength(value, 'utf8') <= 72
        ) || 'Usá al menos 12 caracteres y como máximo 72 bytes.',
    });

    await password({
      message: 'Repetí la contraseña:',
      mask: '*',
      validate: (value) =>
        value === clave || 'Las contraseñas no coinciden.',
    });

    const approved = await confirm({
      message:
        '¿Crear esta cuenta como primer administrador de desarrollo?',
      default: false,
    });

    if (!approved) {
      console.log('Operación cancelada.');
      return;
    }

    connection = await getLomasPool().getConnection();

    const [identity] = await connection.execute(
      'SELECT DATABASE() AS base_actual'
    );

    if (identity[0].base_actual !== 'lomas_eveneser_dev') {
      throw new Error('Base incorrecta');
    }

    // Evita que dos ejecuciones de este comando creen
    // simultáneamente el primer administrador.
    const [lock] = await connection.execute(
      "SELECT GET_LOCK('lomas_first_admin', 5) AS acquired"
    );

    if (Number(lock[0].acquired) !== 1) {
      throw new Error('No se obtuvo el bloqueo');
    }

    locked = true;

    const [admins] = await connection.execute(
      `SELECT COUNT(*) AS total
       FROM usuarios
       WHERE rol = 'administrador'`
    );

    if (Number(admins[0].total) > 0) {
      console.log(
        'Ya existe un administrador. Este comando no crea otro.'
      );
      return;
    }

    const hash = await bcrypt.hash(clave, 12);

    await connection.execute(
      `INSERT INTO usuarios
         (nombre, email, password_hash, rol, estado)
       VALUES (?, ?, ?, 'administrador', 'activo')`,
      [nombre.trim(), email.trim().toLowerCase(), hash]
    );

    console.log('Primer administrador creado correctamente.');
    console.log('No se enviaron correos.');
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      console.log('Operación cancelada.');
    } else if (error.code === 'ER_DUP_ENTRY') {
      console.error(
        'Ese correo ya existe. No se modificó su cuenta ni su rol.'
      );
      process.exitCode = 1;
    } else {
      console.error(
        'No se pudo completar la creación del administrador.'
      );
      process.exitCode = 1;
    }
  } finally {
    if (connection) {
      try {
        if (locked) {
          await connection.execute(
            "SELECT RELEASE_LOCK('lomas_first_admin')"
          );
        }
      } finally {
        connection.release();
      }
    }

    await closeLomasPool();
  }
}

main().catch(() => {
  console.error('No se pudo finalizar el comando.');
  process.exitCode = 1;
});