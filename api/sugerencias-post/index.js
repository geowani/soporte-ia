// /api/sugerencias-post/index.js
const { getPool, sql } = require('../_db');

function getAllowedStates() {
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
  // ---- CORS / preflight ----
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,x-user-email,x-agent-id'
      }
    };
    return;
  }

 
// ---------- GET: listar sugerencias ----------
  if (req.method === 'GET') {
  try {
    const pool = await getPool();

    // Filtros
    const top = Math.min(Math.max(parseInt(req.query.top || '50', 10), 1), 200);
    const term = String(req.query.term || '').trim();
    const estado = String(req.query.estado || '').trim().toLowerCase();
    const agenteIdQ = Number(req.query.agenteId || 0);

    const q = pool.request().input('top', sql.Int, top);
    let where = '1=1';

    if (term) {
      q.input('term', sql.NVarChar(100), `%${term}%`);
      where += ' AND (s.numero_caso LIKE @term OR s.notas LIKE @term)';
    }
    if (estado) {
      q.input('estado', sql.NVarChar(50), estado);
      where += ' AND s.estado = @estado';
    }
    if (Number.isInteger(agenteIdQ) && agenteIdQ > 0) {
      q.input('agenteId', sql.Int, agenteIdQ);
      where += ' AND s.agente_id = @agenteId';
    }

    const rs = await q.query(`
      SELECT TOP (@top)
        s.id_sugerencia               AS id,
        s.numero_caso                 AS numeroCaso,
        s.agente_id                   AS agenteId,
        ISNULL(u.nombre_completo,'')  AS agenteNombre,
        ISNULL(u.correo,'')           AS agenteEmail,
        s.estado,
        s.notas,
        s.creado_en                   AS creadoEn
      FROM dbo.sugerencia s
      LEFT JOIN dbo.usuario u
        ON u.id_usuario = s.agente_id
      WHERE ${where}
      ORDER BY s.creado_en DESC;
    `);

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: rs.recordset
    };
    return;
  } catch (err) {
    context.log.error('GET /sugerencias ERROR:', err);
    context.res = { status: 500, body: { error: 'Error listando sugerencias' } };
    return;
  }
}


  // ---------- POST: crear sugerencia (tu lógica + resolución por correo) ----------
  try {
    const body = req.body || {};
    const numeroCaso = String(body.numeroCaso || '').trim();

    if (!numeroCaso) {
      context.res = { status: 400, body: { error: 'numeroCaso es requerido' } };
      return;
    }

    const cookieStr = req.headers.cookie || '';
    const cookieAgent = (/(?:^|;\s*)agent_id=(\d+)/.exec(cookieStr) || [])[1];
    const headerAgent = req.headers['x-agent-id'];
    const headerEmail = String(req.headers['x-user-email'] || '').trim().toLowerCase();

    const pool = await getPool();

    let agenteId = null;
    let source = null;

    // 1) Si llega correo, resolvemos SIEMPRE por correo (y error si no existe)
    if (headerEmail) {
      const rs = await pool.request()
        .input('correo', sql.NVarChar(256), headerEmail)
        .query(`
          SELECT TOP 1 id_usuario
          FROM dbo.usuario
          WHERE LTRIM(RTRIM(LOWER(correo))) = @correo AND activo = 1;
        `);

      if (!rs.recordset.length) {
        context.res = {
          status: 400,
          body: { error: 'Correo no encontrado o inactivo', correo: headerEmail }
        };
        return;
      }

      agenteId = rs.recordset[0].id_usuario;
      source = 'email';
      context.log(`agenteId por correo (${headerEmail}) => ${agenteId}`);
    } else {
      // 2) Sin correo: usamos body/header/cookie/env
      agenteId = firstValidInt([
        body.agenteId,
        headerAgent,
        cookieAgent,
        process.env.SUG_AGENTE_DEFAULT
      ]);
      source = agenteId ? 'id' : null;
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
      .input('numeroCaso', sql.NVarChar(50), numeroCaso)
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

    context.res = {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
      body: {
        id,
        row: just.recordset[0],
        resolvedAgenteId: agenteId,
        source // 'email' o 'id'
      }
    };
  } catch (err) {
    context.log.error('POST /sugerencias ERROR:', err);
    context.res = { status: 500, body: { error: 'Error creando sugerencia', detail: String(err?.message || err) } };
  }
};
