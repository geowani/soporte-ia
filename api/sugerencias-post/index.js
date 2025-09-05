// /api/sugerencias-post/index.js
const { getPool, sql } = require('../_db');

module.exports = async function (context, req) {
  try {
    const { numeroCaso, agenteId, notas } = req.body || {};
    if (!numeroCaso || !agenteId) {
      context.res = { status: 400, body: { error: 'numeroCaso y agenteId son requeridos' } };
      return;
    }

    const pool = await getPool();

    const r = await pool.request()
      .input('numeroCaso', sql.NVarChar(50), numeroCaso)
      .input('agenteId', sql.Int, agenteId)
      .input('notas', sql.NVarChar(sql.MAX), notas || '')
      .query(`
        INSERT INTO dbo.sugerencia (numero_caso, agente_id, estado, notas, creado_en)
        OUTPUT INSERTED.id_sugerencia AS id
        VALUES (@numeroCaso, @agenteId, 'NUEVO', @notas, SYSUTCDATETIME())
      `);

    context.res = { status: 201, body: { id: r.recordset[0].id } };
  } catch (err) {
    context.log.error(err);
    context.res = { status: 500, body: { error: 'Error creando sugerencia' } };
  }
};
