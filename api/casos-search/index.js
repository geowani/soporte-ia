// /api/casos-search/index.js
const { getPool, sql } = require("../_db");

module.exports = async function (context, req) {
  try {
    const q = (req.query.q || "").toString();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const pageSize = Math.max(parseInt(req.query.pageSize || "20", 10), 1);

    const pool = await getPool();
    const rs = await pool
      .request()
      .input("q", sql.NVarChar(200), q)
      .input("page", sql.Int, page)
      .input("pageSize", sql.Int, pageSize)
      .execute("[dbo].[sp_caso_buscar]");

    const items = rs.recordset || [];
    const total = items.length ? items[0].total : 0;

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { items, total, page, pageSize, q }
    };
  } catch (err) {
    // Log interno para diagnóstico (visible solo en App Insights / Logs)
    context.log.error("GET /api/casos/search ERROR:", err);
    // Respuesta segura al cliente
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: "Error al buscar casos" }
    };
  }
};
