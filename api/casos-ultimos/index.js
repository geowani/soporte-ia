// /api/casos-ultimos/index.js
const { getPool, sql } = require("../_db");

module.exports = async function (context, req) {
  try {
    const limit = Math.max(parseInt(req.query.limit || "10", 10), 1);

    const pool = await getPool();
    const rs = await pool
      .request()
      .input("limit", sql.Int, limit)
      .execute("[dbo].[sp_caso_ultimos]");

    const items = (rs.recordset || []).map(r => ({
      numero_caso: r.numero_caso,
      titulo_pref: r.titulo_pref,
      creado_por:  r.creado_por,
      fecha_creacion: r.fecha_creacion
    }));

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { items, limit }
    };
  } catch (err) {
    context.log.error("GET /api/casos/ultimos ERROR:", err);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: "Error al listar últimos casos" }
    };
  }
};
