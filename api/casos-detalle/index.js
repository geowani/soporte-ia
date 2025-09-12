// Azure Function: GET /api/casos/detalle/{idOrNumero}
const sql = require("mssql");

let pool; // cache de conexión

async function getPool() {
  if (pool && pool.connected) return pool;
  pool = await sql.connect(process.env.SQL_CONN); // usa tu var de entorno en Azure
  return pool;
}

module.exports = async function (context, req) {
  const idOrNumero = req.params.idOrNumero;
  if (!idOrNumero) {
    context.res = { status: 400, jsonBody: { error: "Falta idOrNumero" } };
    return;
  }

  try {
    const db = await getPool();
    const result = await db
      .request()
      .input("id_or_numero", sql.NVarChar(40), String(idOrNumero))
      .execute("dbo.sp_caso_detalle");

    const row = (result.recordset && result.recordset[0]) || null;

    if (!row) {
      context.res = { status: 404, jsonBody: { error: "No encontrado" } };
      return;
    }

    // ¡Devuelve tal cual las columnas del SP!
    context.res = { status: 200, jsonBody: row };
  } catch (err) {
    context.log.error("casos-detalle error:", err);
    context.res = { status: 500, jsonBody: { error: "Server error" } };
  }
};
