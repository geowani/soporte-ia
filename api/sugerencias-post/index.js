const { getPool, sql } = require('../_db');

function getAllowedStates() {
  // Puedes sobreescribir con env SUG_ESTADOS="pending,approved,rejected"
  const raw = process.env.SUG_ESTADOS || 'pending,approved,rejected';
  return raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

module.exports = async function (context, req) {
  try {
    const body = req.body || {};
    const numeroCaso = String(body.numeroCaso || '').trim();
    const agenteId = Number(body.agenteId);
    const notas = String(body.notas || '').trim();

    if (!numeroCaso) return (context.res = { status: 400, body: { error: 'numeroCaso es requerido' } });
    if (!Number.isInteger(agenteId) || agenteId <= 0)
      return (context.res = { status: 400, body: { error: 'agenteId debe ser entero > 0' } });

    const allowed = getAllowedStates();
    const estadoDefault = (process.env.SUG_ESTADO_DEFAULT || 'pending').toLowerCase();
    const estado = String(body.estado || estadoDefault).toLowerCase();

    if (!allowed.includes(estado)) {
      return (context.res = {
        status: 400,
        body: { error: 'estado inválido', detalle: { recibido: estado, permitidos: allowed } }
      });
    }

    const pool = await getPool();
    const insert = await pool.request()
      .input('numeroCaso', sql.NVarChar(50), numeroCaso)  // ajusta 50 si tu columna es más corta
      .input('agenteId', sql.Int, agenteId)
      .input('notas', sql.NVarChar(sql.MAX), notas)
      .input('estado', sql.NVarChar(50), estado)
      .query(`
        INSERT INTO dbo.sugerencia (numero_caso, agente_id, estado, notas, creado_en)
        OUTPUT INSERTED.id_sugerencia AS id
        VALUES (@numeroCaso, @agenteId, @estado, @notas, SYSUTCDATETIME())
      `);

    const id = insert.recordset[0].id;
    const just = await pool.request().input('id', sql.Int, id).query(`
      SELECT id_sugerencia AS id, numero_caso AS numeroCaso, agente_id AS agenteId,
             estado, notas, creado_en AS creadoEn
      FROM dbo.sugerencia WHERE id_sugerencia = @id
    `);

    context.res = { status: 201, body: { id, row: just.recordset[0] } };
  } catch (err) {
    context.log.error('POST /sugerencias ERROR:', err);
    context.res = { status: 500, body: { error: 'Error creando sugerencia', detail: String(err?.message || err) } };
  }
};
