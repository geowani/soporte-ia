// /api/_db.js
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER,         // ej: your-sql.database.windows.net
  user: process.env.DB_USER,             // ej: genpactadmin
  password: process.env.DB_PASSWORD,     // *** App Setting, nunca en código ***
  database: process.env.DB_NAME || 'genpactcasos',
  options: {
    encrypt: true,
    trustServerCertificate: false
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

let poolPromise;
async function getPool() {
  if (!poolPromise) poolPromise = sql.connect(config);
  return poolPromise;
}

module.exports = { sql, getPool };
