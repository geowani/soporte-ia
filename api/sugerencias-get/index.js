// /api/sugerencias-get/index.js
const { getPool, sql } = require('../_db');

module.exports = async function (context, req) {
  try {
    const term = (req.query.term || '').trim();
    const topN = Math.min(parseInt(req.query.top || '20', 10), 50);

    const pool = await getPool();

    const result = await pool.request()
      .input('term', sql.NVarChar(200), `%${term}%`)
      .input('topN', sql.Int, topN)
      .query(`
        SELECT TOP (@topN)
               id_sugerencia    AS id,
               numero_caso      AS numeroCaso,
               agente_id        AS agenteId,
               estado,
               notas,
               creado_en        AS creadoEn
        FROM dbo.sugerencia WITH (NOLOCK)
        WHERE (@term = '%%'
            OR numero_caso LIKE @term
            OR notas LIKE @term)
        ORDER BY creado_en DESC
      `);

    context.res = { status: 200, body: result.recordset };
  } catch (err) {
    context.log.error(err);
    context.res = { status: 500, body: { error: 'Error listando sugerencias' } };
  }
};
