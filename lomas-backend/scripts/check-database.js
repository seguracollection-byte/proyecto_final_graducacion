const mysql = require('mysql2/promise');
const { loadDevelopmentDatabase } = require('../config/developmentDatabase');
async function main() {
  let connection;
  try {
    connection = await mysql.createConnection(loadDevelopmentDatabase());
    const [rows] = await connection.execute('SELECT DATABASE() AS database_name, CURRENT_USER() AS account, VERSION() AS version');
    if (rows[0].database_name !== 'lomas_eveneser_dev' || rows[0].account !== 'lomas_app_dev@localhost') {
      throw new Error('La identidad o base efectiva no coincide con desarrollo.');
    }
    console.log('Conexión comprobada:', rows[0]);
    console.log('Solo lectura: no se crearon tablas, no se modificaron registros ni se enviaron correos.');
  } catch (error) {
    const known = {
      ER_ACCESS_DENIED_ERROR: 'Acceso rechazado. Revisar la contraseña del usuario lomas_app_dev.',
      ER_BAD_DB_ERROR: 'La base de desarrollo no existe en este servidor.',
      ECONNREFUSED: 'No hay conexión al servidor. Revisar MariaDB en XAMPP.',
      ETIMEDOUT: 'Tiempo de conexión agotado.'
    };
    // No imprimir el objeto de error: puede incluir detalles de configuración.
    console.error(known[error.code] || (error.code ? 'No se pudo comprobar la conexión.' : error.message));
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
}
main();
