// Azure Function: GET /api/casos/detalle/{idOrNumero}
const sql = require("mssql");

let pool;

async function getPool() {
  const connStr = process.env.SQL_CONN || process.env.DB_CONN;
  if (!connStr) throw new Error("Missing SQL_CONN/DB_CONN");
  if (pool?.connected) return pool;
  pool = await sql.connect(connStr);
  return pool;
}

module.exports = async function (context, req) {
  const idOrNumero = req.params?.idOrNumero ? String(req.params.idOrNumero) : "";
  if (!idOrNumero) {
    context.res = {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ error: "Falta idOrNumero" })
    };
    return;
  }

  try {
    const db = await getPool();
    const result = await db.request()
      .input("id_or_numero", sql.NVarChar(40), idOrNumero)
      .execute("dbo.sp_caso_detalle");

    const row = result.recordset?.[0] || null;

    if (!row) {
      context.res = {
        status: 404,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ error: "No encontrado" })
      };
      return;
    }

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(row)
    };
  } catch (err) {
    context.log.error("casos-detalle error:", {
      message: err.message, code: err.code, number: err.number
    });
    try { if (pool && !pool.connected) { await pool.close().catch(()=>{}); pool = undefined; } } catch {}
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ error: "Server error" })
    };
  }
};
