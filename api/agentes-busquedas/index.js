const { getPool, sql } = require("../_db");

module.exports = async function (context, req) {
  try {
    const pool = await getPool();
    const dias = req.query?.dias != null ? Number(req.query.dias) : null;

    const rs = await pool.request()
      .input("dias", sql.Int, Number.isFinite(dias) ? dias : null)
      .execute("dbo.sp_agentes_busquedas");

    const items = (rs.recordset || []).map(r => ({
      agente_id: r.agente_id,
      agente_nombre: r.agente_nombre,
      busquedas_realizadas: r.busquedas_realizadas
    }));

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { items }
    };
  } catch (err) {
    context.log.error("GET /api/agentes-busquedas ERROR:", err);
    context.res = { status: 500, body: { error: "Error obteniendo ranking" } };
  }
};
