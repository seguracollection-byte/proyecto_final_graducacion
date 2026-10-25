const mysql = require('mysql2/promise');
const {
  loadDevelopmentDatabase,
} = require('./developmentDatabase');

let pool;

function getLomasPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...loadDevelopmentDatabase(),
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 20,
      timezone: 'Z',
      charset: 'utf8mb4',
    });
  }

  return pool;
}

async function closeLomasPool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

module.exports = { getLomasPool, closeLomasPool };