// /api/sugerencias-estado/index.js
const { getPool, sql } = require('../_db');

module.exports = async function (context, req) {
  try {
    const id = parseInt(context.bindingData.id, 10);
    const { estado, utilidad } = req.body || {};
    if (!id || !estado) {
      context.res = { status: 400, body: { error: 'id y estado son requeridos' } };
      return;
    }

    const pool = await getPool();

    // Si tienes SP: sp_sugerencia_actualizar_estado
    // await pool.request()
    //   .input('p_id', sql.Int, id)
    //   .input('p_estado', sql.NVarChar(50), estado)
    //   .input('p_utilidad', sql.Int, utilidad ?? 0)
    //   .execute('sp_sugerencia_actualizar_estado');

    await pool.request()
      .input('id', sql.Int, id)
      .input('estado', sql.NVarChar(50), estado)
      .input('utilidad', sql.Int, utilidad ?? 0)
      .query(`
        UPDATE dbo.sugerencia
           SET estado = @estado,
               utilidad = @utilidad,
               fecha_actualizacion = SYSUTCDATETIME()
         WHERE id_sugerencia = @id
      `);

    context.res = { status: 204 };
  } catch (err) {
    context.log.error(err);
    context.res = { status: 500, body: { error: 'Error actualizando estado' } };
  }
};
