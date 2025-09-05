// /api/sugerencias-post/index.js
const { getPool, sql } = require('../_db');

function getAllowedStates() {
  // Tu tabla permite: pending, approved, rejected
  const raw = process.env.SUG_ESTADOS || 'pending,approved,rejected';
  return raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

function firstValidInt(list, min = 1) {
  for (const v of list) {
    const n = Number(v);
    if (Number.isInteger(n) && n >= min) return n;
  }
  return null;
}

module.exports = async function (context, req) {
  try {
    const body = req.body || {};
    const numeroCaso = String(body.numeroCaso || '').trim();

    // lee de cookie agent_id=7
    const cookieStr = req.headers.cookie || '';
    const cookieAgent = (/(?:^|;\s*)agent_id=(\d+)/.exec(cookieStr) || [])[1];

    // candidatos: body, header, cookie, env, fallback 1
    const agenteId = firstValidInt([
      body.agenteId,
      req.headers['x-agent-id'],
      cookieAgent,
      process.env.SUG_AGENTE_DEFAULT,
      1
    ]);

    if (!numeroCaso) {
      context.res = { status: 400, body: { error: 'numeroCaso es requerido' } };
      return;
    }
    if (!agenteId) {
      context.res = { status: 400, body: { error: 'No se pudo determinar agenteId (envía header x-agent-id o configura SUG_AGENTE_DEFAULT)' } };
      return;
    }

    const allowed = getAllowedStates();
    const estadoDefault = (process.env.SUG_ESTADO_DEFAULT || 'pending').toLowerCase();
    const estado = String(body.estado || estadoDefault).toLowerCase();
    if (!allowed.includes(estado)) {
      context.res = { status: 400, body: { error: 'estado inválido', detalle: { recibido: estado, permitidos: allowed } } };
      return;
    }

    const pool = await getPool();

    const insert = await pool.request()
      .input('numeroCaso', sql.NVarChar(50), numeroCaso)   // ajusta 50 si tu columna es más corta
      .input('agenteId',  sql.Int, agenteId)
      .input('estado',    sql.NVarChar(50), estado)
      .input('notas',     sql.NVarChar(sql.MAX), String(body.notas || ''))
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
