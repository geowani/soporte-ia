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

    if (!numeroCaso) {
      context.res = { status: 400, body: { error: 'numeroCaso es requerido' } };
      return;
    }

    // --- candidatos básicos: body, header, cookie, env
    const cookieStr = req.headers.cookie || '';
    const cookieAgent = (/(?:^|;\s*)agent_id=(\d+)/.exec(cookieStr) || [])[1];

    let agenteId = firstValidInt([
      body.agenteId,
      req.headers['x-agent-id'],
      cookieAgent,
      process.env.SUG_AGENTE_DEFAULT
    ]);

    // --- NUEVO: correo para resolver el id del usuario logueado
    const userEmail = String(req.headers['x-user-email'] || '').trim().toLowerCase();

    const pool = await getPool();

    // Si viene correo, resolvemos SIEMPRE por correo y priorizamos ese id
    // (así evitamos que se quede un agentId viejo del cliente).
    if (userEmail) {
      const rs = await pool.request()
        .input('correo', sql.NVarChar(256), userEmail)
        .query('SELECT TOP 1 id_usuario FROM dbo.usuario WHERE correo = @correo AND activo = 1;');

      if (rs.recordset.length) {
        agenteId = rs.recordset[0].id_usuario;
        context.log(`agenteId resuelto por correo (${userEmail}) => ${agenteId}`);
      } else {
        context.log(`correo ${userEmail} no encontrado/activo en dbo.usuario`);
      }
    }

    if (!agenteId) {
      context.res = {
        status: 400,
        body: { error: 'No se pudo determinar agenteId (envía x-user-email o x-agent-id / configura SUG_AGENTE_DEFAULT)' }
      };
      return;
    }

    const allowed = getAllowedStates();
    const estadoDefault = (process.env.SUG_ESTADO_DEFAULT || allowed[0] || 'pending').toLowerCase();
    const estado = String(body.estado || estadoDefault).toLowerCase();
    if (!allowed.includes(estado)) {
      context.res = { status: 400, body: { error: 'estado inválido', detalle: { recibido: estado, permitidos: allowed } } };
      return;
    }

    const insert = await pool.request()
      .input('numeroCaso', sql.NVarChar(50), numeroCaso)   // ajusta la longitud si tu columna es más corta/larga
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
