// /api/ping-db/index.js
const { getPool } = require("../_db");

module.exports = async function (context, req) {
  try {
    const pool = await getPool();
    const rs = await pool
      .request()
      .query("SELECT DB_NAME() AS db_name, SUSER_SNAME() AS login_name, SYSDATETIMEOFFSET() AS now_utc");

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { ok: true, info: rs.recordset?.[0] || null }
    };
  } catch (e) {
    context.log.error("PING-DB ERROR:", e);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { ok: false, error: "DB no disponible" }
    };
  }
};
