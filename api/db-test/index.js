const sql = require('mssql');

module.exports = async function (context, req) {
  try {
    const cfg = { connectionString: process.env.SQL_CONN_STR, options: { encrypt: true } };
    const t0 = Date.now();

    const pool = await sql.connect(cfg);

    // 1) Confirma conexión
    const v = await pool.request().query('SELECT @@VERSION AS ver');

    // 2) Muestra top 3 reales de dbo.caso
    const top = await pool.request().query(`
      SELECT TOP 3 id_caso, numero_caso, asunto, fecha_creacion
      FROM dbo.caso
      ORDER BY id_caso DESC`);

    // 3) Invoca tu SP con el texto de prueba
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
