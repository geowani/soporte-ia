// /api/ping-db/index.js
// Ping de salud a la base de datos con diagnóstico detallado.
const { getPool } = require("../_db"); // usamos el pool real

function envSnapshot() {
  return {
    has_DB_CONN: !!process.env.DB_CONN,
    DB_SERVER: process.env.DB_SERVER || null,
    DB_NAME: process.env.DB_NAME || null,
    DB_USER_set: !!process.env.DB_USER || false,
    DB_PASSWORD_set: !!process.env.DB_PASSWORD || false
  };
}

function serializeError(err) {
  // Los errores de 'mssql' traen propiedades útiles
  const out = {
    name: err.name,
    message: err.message,
    code: err.code || null,
    number: typeof err.number === "number" ? err.number : null
  };
  if (err.originalError) {
    out.originalError = {
      info: err.originalError.info || null,
      message: err.originalError.message || null,
      code: err.originalError.code || null,
      number: typeof err.originalError.number === "number" ? err.originalError.number : null
    };
  }
  // stack como string (sin objetos circulares)
  out.stack = String(err.stack || "");
  return out;
}

module.exports = async function (context, req) {
  try {
    // 1) Abrimos pool (si falla aquí, devolvemos el error detallado)
    const pool = await getPool();

    // 2) Info básica de la sesión/servidor/DB
    const rs = await pool.request().query(`
      SELECT
        DB_NAME()                                  AS db_name,
        CONVERT(sysname, SERVERPROPERTY('ServerName')) AS server_name,
        SUSER_SNAME()                              AS login_name,
        SYSDATETIMEOFFSET()                        AS now_utc,
        @@SPID                                      AS spid
    `);

    // 3) Opcional: versión del motor
    const ver = await pool.request().query(`SELECT @@VERSION AS version_text`);

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        ok: true,
        env: envSnapshot(),
        info: rs.recordset?.[0] || null,
        version: ver.recordset?.[0]?.version_text || null
      }
    };
  } catch (err) {
    context.log.error("PING-DB ERROR:", err);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: {
        ok: false,
        env: envSnapshot(),
        error: serializeError(err)
      }
    };
  }
};
