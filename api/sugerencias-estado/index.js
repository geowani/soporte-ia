const { getPool, sql } = require('../_db');

function getAllowedStates() {
  const raw = process.env.SUG_ESTADOS || 'pending,approved,rejected';
  return raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

module.exports = async function (context, req) {
  try {
    const id = parseInt(context.bindingData.id, 10);
    const { estado, notas } = req.body || {};
    if (!id) return (context.res = { status: 400, body: { error: 'id es requerido' } });

    const allowed = getAllowedStates();
    const next = String(estado || '').toLowerCase();
    if (!next || !allowed.includes(next)) {
      return (context.res = {
        status: 400,
        body: { error: 'estado inválido', detalle: { recibido: next, permitidos: allowed } }
      });
    }

    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .input('estado', sql.NVarChar(50), next)
      .input('notas', sql.NVarChar(sql.MAX), (notas ?? '').toString())
      .query(`
        UPDATE dbo.sugerencia
           SET estado = @estado,
               notas  = CASE WHEN @notas <> '' THEN @notas ELSE notas END
         WHERE id_sugerencia = @id
      `);

    context.res = { status: 204 };
  } catch (err) {
    context.log.error('PATCH /sugerencias/{id}/estado ERROR:', err);
    context.res = { status: 500, body: { error: 'Error actualizando estado', detail: String(err?.message || err) } };
  }
};
