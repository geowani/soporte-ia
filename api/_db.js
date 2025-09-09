// /api/_db.js
const sql = require("mssql");

/**
 * Construye la configuración de conexión a partir de las variables de entorno.
 * - Opción A: DB_CONN (connection string completa)
 * - Opción B: variables sueltas (DB_SERVER, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT?)
 */
function cfgFromEnv() {
  // A) Connection string completa
  if (process.env.DB_CONN) {
    return {
      connectionString: process.env.DB_CONN,
      options: {
        encrypt: true,
        trustServerCertificate: false
      },
      pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
      requestTimeout: 30000,
      connectionTimeout: 30000
    };
  }

  // B) Variables sueltas
  const { DB_SERVER, DB_USER, DB_PASSWORD } = process.env;
  const DB_NAME = process.env.DB_NAME || "genpactcasos";
  const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 1433;

  return {
    server: DB_SERVER,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
    options: {
      encrypt: true,
      trustServerCertificate: false
    },
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

/**
 * Retorna un pool global (singleton). Si falla, resetea el pool para permitir reintentos.
 */
async function getPool() {
  const miss = missingEnv();
  if (miss) {
    throw new Error(
      `Faltan variables: ${miss.join(
        ", "
      )}. Define DB_CONN o (DB_SERVER, DB_USER, DB_PASSWORD, DB_NAME).`
    );
  }

  // Si ya hay conexión en curso, reutiliza
  if (poolPromise) return poolPromise;

  const cfg = cfgFromEnv();

  // Validación suave para 'server' cuando no hay connectionString
  if (!cfg.connectionString) {
    if (typeof cfg.server !== "string" || !cfg.server.trim()) {
      throw new TypeError(
        "La variable DB_SERVER no está definida o no es válida."
      );
    }
  }

  // Abre el pool (global). Si falla, limpia para permitir otro intento.
  poolPromise = sql
    .connect(cfg)
    .then((p) => {
      console.log("[DB] Pool conectado a", cfg.connectionString ? "DB_CONN" : `${cfg.server}/${cfg.database}`);
      return p;
    })
    .catch((err) => {
      // Limpia el estado global de mssql y nuestro promise
      try { sql.close(); } catch { /* noop */ }
      poolPromise = undefined;
      throw err;
    });

  return poolPromise;
}

/**
 * Cierra el pool global y permite reconectar en la próxima llamada.
 * Útil en despliegues calientes o pruebas.
 */
function disposePool() {
  try { sql.close(); } catch { /* noop */ }
  poolPromise = undefined;
}

module.exports = { sql, getPool, cfgFromEnv, missingEnv, disposePool };
