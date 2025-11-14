// /api/_db.js
const sql = require("mssql");

/**
 * Config desde variables sueltas (solo si NO hay DB_CONN)
 */
function cfgFromEnv() {
  const { DB_SERVER, DB_USER, DB_PASSWORD } = process.env;
  const DB_NAME = process.env.DB_NAME || "genpactcasos";
  const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 1433;

  return {
    server: DB_SERVER,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
    options: { encrypt: true, trustServerCertificate: false },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    requestTimeout: 30000,
    connectionTimeout: 30000
  };
}

/**
 * Verifica variables faltantes cuando NO se usa DB_CONN.
 */
function missingEnv() {
  if (process.env.DB_CONN) return null;
  const miss = [];
  if (!process.env.DB_SERVER) miss.push("DB_SERVER");
  if (!process.env.DB_USER) miss.push("DB_USER");
  if (!process.env.DB_PASSWORD) miss.push("DB_PASSWORD");
  if (!process.env.DB_NAME) miss.push("DB_NAME");
  return miss.length ? miss : null;
}

let poolPromise;

async function getPool() {
  // Si ya hay conexión en curso, reutiliza
  if (poolPromise) return poolPromise;

  // Si hay DB_CONN, conecta con la cadena directa
  if (process.env.DB_CONN) {
    const connStr = process.env.DB_CONN;
    poolPromise = sql.connect(connStr).catch(err => {
      try { sql.close(); } catch {}
      poolPromise = undefined;
      throw err;
    });
    return poolPromise;
  }

  // Variables sueltas (valida requeridos)
  const miss = missingEnv();
  if (miss) {
    throw new Error(
      `Faltan variables: ${miss.join(", ")}. Define DB_CONN o (DB_SERVER, DB_USER, DB_PASSWORD, DB_NAME).`
    );
  }

  const cfg = cfgFromEnv();
  if (typeof cfg.server !== "string" || !cfg.server.trim()) {
    throw new TypeError("La variable DB_SERVER no está definida o no es válida.");
  }

  poolPromise = sql.connect(cfg).catch(err => {
    try { sql.close(); } catch {}
    poolPromise = undefined;
    throw err;
  });
  return poolPromise;
}

/** Cierra el pool global*/
function disposePool() {
  try { sql.close(); } catch {}
  poolPromise = undefined;
}

module.exports = { sql, getPool, cfgFromEnv, missingEnv, disposePool };
