// /api/_db.js
const sql = require('mssql');

function cfgFromEnv() {
  // Opción A: connection string completa
  if (process.env.DB_CONN) {
    return {
      connectionString: process.env.DB_CONN,
      options: { encrypt: true, trustServerCertificate: false },
      pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
    };
  }

  // Opción B: variables sueltas
  const { DB_SERVER, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  return {
    server: DB_SERVER,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME || 'genpactcasos',
    options: { encrypt: true, trustServerCertificate: false },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
  };
}

function missingEnv() {
  if (process.env.DB_CONN) return null;
  const miss = [];
  if (!process.env.DB_SERVER) miss.push('DB_SERVER');
  if (!process.env.DB_USER) miss.push('DB_USER');
  if (!process.env.DB_PASSWORD) miss.push('DB_PASSWORD');
  if (!process.env.DB_NAME) miss.push('DB_NAME');
  return miss.length ? miss : null;
}

let poolPromise;
async function getPool() {
  const missing = missingEnv();
  if (missing) {
    const msg = `Faltan variables: ${missing.join(', ')}. Define DB_CONN o (DB_SERVER, DB_USER, DB_PASSWORD, DB_NAME).`;
    throw new Error(msg);
  }
  const config = cfgFromEnv();

  // Validación extra para 'server'
  if (!config.connectionString && (typeof config.server !== 'string' || !config.server.trim())) {
    throw new TypeError('La variable DB_SERVER no está definida o no es válida.');
  }

  if (!poolPromise) poolPromise = sql.connect(config);
  return poolPromise;
}

module.exports = { sql, getPool, cfgFromEnv, missingEnv };
