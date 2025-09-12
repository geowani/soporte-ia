// Azure Function: GET /api/casos/detalle/{idOrNumero}
const sql = require("mssql");

let pool; // cache de conexión entre invocaciones

async function getPool() {
  const connStr = process.env.SQL_CONN || process.env.DB_CONN;
  if (!connStr) {
    throw new Error("Missing SQL_CONN/DB_CONN environment variable");
  }
  if (pool && pool.connected) return pool;

  // Puedes ajustar opciones si necesitas timeouts específicos:
  // sql.connect(connStr, { options: { requestTimeout: 30000 } })
  pool = await sql.connect(connStr);
  return pool;
}

module.exports = async function (context, req) {
  const idOrNumero = req.params && req.params.idOrNumero
    ? String(req.params.idOrNumero)
    : "";

  if (!idOrNumero) {
    context.res = {
      status: 400,
      jsonBody: { error: "Falta idOrNumero" },
    };
    return;
  }

  try {
    const db = await getPool();

    const result = await db
      .request()
      .input("id_or_numero", sql.NVarChar(40), idOrNumero)
      .execute("dbo.sp_caso_detalle");

    const row = (result.recordset && result.recordset[0]) || null;

    if (!row) {
      context.res = { status: 404, jsonBody: { error: "No encontrado" } };
      return;
    }

    // Devuelve tal cual las columnas del SP:
    // { id, codigo, titulo, descripcion, departamento, nivel, inicio, cierre, solucion, resuelto_por }
    context.res = {
      status: 200,
      jsonBody: row,
    };
  } catch (err) {
    // Log detallado para diagnóstico en Azure (no exponer al cliente)
    context.log.error("casos-detalle error:", {
      message: err.message,
      code: err.code,
      number: err.number,
      stack: err.stack,
    });

    // Si el pool quedó en mal estado, fuerza reconexión en la próxima llamada
    try {
      if (pool && !pool.connected) {
        await pool.close().catch(() => {});
        pool = undefined;
      }
    } catch (_) { /* ignore */ }

    context.res = {
      status: 500,
      jsonBody: { error: "Server error" },
    };
  }
};
