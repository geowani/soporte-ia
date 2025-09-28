const sql = require('mssql');

function parseConnStr(connStr) {
  const parts = {};
  connStr.split(';').forEach(p => {
    const [k, v] = p.split('=');
    if (!k || !v) return;
    parts[k.trim().toLowerCase()] = v.trim();
  });
  return {
    server: (parts["server"] || "").replace("tcp:", "").split(",")[0],
    port: parts["server"]?.includes(",") ? parseInt(parts["server"].split(",")[1]) : 1433,
    database: parts["database"],
    user: parts["user id"],
    password: parts["password"],
    options: {
      encrypt: (parts["encrypt"] || "true").toLowerCase() === "true",
      trustServerCertificate: (parts["trustservercertificate"] || "false").toLowerCase() === "true"
    }
  };
}

module.exports = async function (context, req) {
  try {
    const raw = process.env.SQL_CONN_STR || "";
    const cfg = parseConnStr(raw);
    const t0 = Date.now();

    const pool = await sql.connect(cfg);

    const v = await pool.request().query('SELECT @@VERSION AS ver');
    const top = await pool.request().query(`
      SELECT TOP 3 id_caso, numero_caso, asunto, fecha_creacion
      FROM dbo.caso
      ORDER BY id_caso DESC`);

    const sp = await pool.request()
      .input('q', sql.NVarChar, 'impresora no imprime en red')
      .input('page', sql.Int, 1)
      .input('pageSize', sql.Int, 3)
      .execute('dbo.sp_caso_buscar_front');

    context.res = {
      status: 200,
      body: {
        ok: true,
        elapsed_ms: Date.now() - t0,
        sql_version: v.recordset?.[0]?.ver || null,
        casos_top3: top.recordset || [],
        sp_rows: sp.recordset?.length || 0,
        sp_sample: sp.recordset?.slice(0, 3) || []
      }
    };
  } catch (err) {
    context.res = { status: 200, body: { ok: false, error: String(err?.message || err) } };
  }
};
