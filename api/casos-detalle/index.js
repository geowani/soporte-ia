const sql = require("mssql");
let pool;
async function getPool(){ if (pool?.connected) return pool; pool = await sql.connect(process.env.SQL_CONN); return pool; }

module.exports = async function (context, req) {
  const idOrNumero = req.params.idOrNumero;
  if (!idOrNumero) { context.res = { status:400, jsonBody:{ error:"Falta idOrNumero" } }; return; }

  try {
    const db = await getPool();
    const result = await db.request()
      .input("id_or_numero", sql.NVarChar(40), String(idOrNumero))
      .execute("dbo.sp_caso_detalle");
    const row = result.recordset?.[0] || null;
    context.res = row ? { status:200, jsonBody:row } : { status:404, jsonBody:{ error:"No encontrado" } };
  } catch (err) {
    context.log.error(err);
    context.res = { status:500, jsonBody:{ error:"Server error" } };
  }
};
