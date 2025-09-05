// /api/sugerencias-post/index.js
const { getPool, sql } = require('../_db');

module.exports = async function (context, req) {
  try {
    const body = req.body || {};
    context.log('POST /sugerencias payload:', body);

    const numeroCaso = String(body.numeroCaso || '').trim();
    const agenteId = Number(body.agenteId);
    const notas = String(body.notas || '').trim();

    if (!numeroCaso) {
      context.res = { status: 400, body: { error: 'numeroCaso es requerido' } };
      return;
    }
    if (!Number.isInteger(agenteId) || agenteId <= 0) {
      context.res = { status: 400, body: { error: 'agenteId debe ser entero > 0' } };
      return;
    }

    const pool = await getPool();

    // IMPORTANTE: ajusta tamaños si tu columna numero_caso no es 50.
    const insert = await pool.request()
      .input('numeroCaso', sql.NVarChar(50), numeroCaso)
      .input('agenteId', sql.Int, agenteId)
      .input('notas', sql.NVarChar(sql.MAX), notas)
      .query(`
        INSERT INTO dbo.sugerencia (numero_caso, agente_id, estado, notas, creado_en)
        OUTPUT INSERTED.id_sugerencia AS id
        VALUES (@numeroCaso, @agenteId, 'NUEVO', @notas, SYSUTCDATETIME())
      `);

    const id = insert.recordset[0].id;

    const justCreated = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT id_sugerencia AS id, numero_caso AS numeroCaso, agente_id AS agenteId,
               estado, notas, creado_en AS creadoEn
        FROM dbo.sugerencia WHERE id_sugerencia = @id
      `);

    context.res = { status: 201, body: { id, row: justCreated.recordset[0] } };
  } catch (err) {
    // Devuelve detalle útil
    const detail = {
      message: err?.message,
      number: err?.number,
      code: err?.code,
      original: err?.original?.message
    };
    context.log.error('POST /sugerencias ERROR:', err);
    context.res = { status: 500, body: { error: 'Error creando sugerencia', detail } };
  }
};
