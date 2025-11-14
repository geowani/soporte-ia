// POST /api/casos/create
const { getPool, sql } = require("../_db");

// convierte "dd/MM/yyyy" -> "yyyy-MM-dd"
function toISODateFromDMY(s) {
  if (!s) return null;
  const m = /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/.exec(String(s).trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const iso = `${yyyy}-${mm}-${dd}`;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return iso; // yyyy-MM-dd
}

// Lee el userId desde header x-user-id o body.creadoPorId
function readCreatorFromReq(req) {
  const headerId = req?.headers?.["x-user-id"];
  const bodyId = req?.body?.creadoPorId;
  const userId = Number(headerId ?? bodyId ?? NaN);
  if (!Number.isFinite(userId) || userId <= 0) return null;
  const email = req?.headers?.["x-user-email"] || null;
  return { id: userId, email };
}

module.exports = async function (context, req) {
  try {
    const body = (req.body || {});

    // ====== Auditoría: usuario que crea el caso ======
    const creator = readCreatorFromReq(req);
    if (!creator) {
      context.res = { status: 401, body: { error: "Falta x-user-id/creadoPorId para auditoría." } };
      return;
    }

    // ====== Campos del formulario ======
    const numero_caso = (body.caso ?? "").toString().trim();                  // opcional
    const asunto      = (body.asunto ?? body.titulo ?? "").toString().trim(); // obligatorio
    const descripcion = (body.descripcion ?? "").toString();
    const solucion    = (body.solucion ?? "").toString();
    const lob         = (body.lob ?? "").toString().trim() || null;

    const nivel = (body.nivel !== undefined && body.nivel !== "" && !Number.isNaN(parseInt(body.nivel, 10)))
      ? parseInt(body.nivel, 10) : null;

    // Entradas desde el form (dd/MM/yyyy)
    const inicio_raw = (body.inicio ?? "").toString().trim();
    const cierre_raw = (body.cierre ?? "").toString().trim();

    // Normaliza a ISO yyyy-MM-dd para consultas SQL inequívocas
    const inicioISO = toISODateFromDMY(inicio_raw);
    const cierreISO = toISODateFromDMY(cierre_raw);

    if (inicio_raw && !inicioISO) {
      context.res = { status: 400, body: { error: "Formato de 'Inicio' inválido. Usa dd/mm/aaaa." } };
      return;
    }
    if (cierre_raw && !cierreISO) {
      context.res = { status: 400, body: { error: "Formato de 'Cierre' inválido. Usa dd/mm/aaaa." } };
      return;
    }

    const inicioFmt = inicioISO ? inicio_raw : null;
    const cierreFmt = cierreISO ? cierre_raw : null;

    // Departamento: NET|SYS|PC|HW
    const rawDept = (body.departamento ?? "").toString().toUpperCase().trim();
    const allowedDepts = new Set(["NET", "SYS", "PC", "HW"]);
    const departamento = allowedDepts.has(rawDept) ? rawDept : null;

    // === Agente: permitir id o nombre ===
    let agente_id = null;
    let agente_nombre = (body.agente_nombre ?? "").toString().trim();
    const agente_raw = (body.agente ?? "").toString().trim();

    if (agente_raw) {
      if (/^\d+$/.test(agente_raw)) agente_id = parseInt(agente_raw, 10);
      else agente_nombre = agente_raw;
    }

    // ====== Validaciones ======
    if (!asunto) {
      context.res = { status: 400, body: { error: "El campo 'asunto' (título) es obligatorio." } };
      return;
    }
    if (nivel !== null && (nivel < 1 || nivel > 3)) {
      context.res = { status: 400, body: { error: "El campo 'nivel' debe ser 1, 2 o 3." } };
      return;
    }

    const pool = await getPool();

    if (!agente_id && agente_nombre) {
      const rsAg = await pool.request()
        .input("q", sql.NVarChar(200), agente_nombre)
        .input("like", sql.NVarChar(210), `%${agente_nombre}%`)
        .query(`
          ;WITH cte AS (
            SELECT id_usuario, 1 AS score
            FROM dbo.usuario
            WHERE nombre_completo = @q
            UNION ALL
            SELECT TOP 1 id_usuario, 0 AS score
            FROM dbo.usuario
            WHERE nombre_completo LIKE @like
            ORDER BY nombre_completo
          )
          SELECT TOP 1 id_usuario FROM cte ORDER BY score DESC, id_usuario;
        `);
      agente_id = rsAg.recordset?.[0]?.id_usuario || null;
    }

    // =============================
    // PRE-CHEQUEO DE DUPLICADO
    // Regla: MISMO numero_caso_norm + MISMO fecha_creacion_dia + MISMO fecha_cierre_dia
    // =============================
    const numeroCasoNorm = (numero_caso || "").toString().trim().toUpperCase();
    if (numeroCasoNorm && inicioISO && cierreISO) {
      const rsDup = await pool.request()
        .input("num", sql.VarChar(40), numeroCasoNorm)
        .input("fi",  sql.Date, inicioISO)   // yyyy-MM-dd
        .input("fc",  sql.Date, cierreISO)   // yyyy-MM-dd
        .query(`
          SELECT TOP 1 id_caso
          FROM dbo.caso
          WHERE numero_caso_norm = @num
            AND fecha_creacion_dia = @fi
            AND CAST(fecha_cierre AS date) = @fc
        `);

      if (rsDup.recordset && rsDup.recordset.length > 0) {
        context.res = {
          status: 409,
          headers: { "Content-Type": "application/json" },
          body: {
            error: "Ya existe el caso en el sistema",
            detail: "Ya existe un caso con el mismo número, fecha de inicio y cierre."
          }
        };
        return;
      }
    }

    // ====== Llamada al SP ======
    let rs, usedFallback = false;
    try {
      rs = await pool.request()
        .input("numero_caso",  sql.VarChar(40),    numero_caso || null)
        .input("asunto",       sql.VarChar(200),   asunto)
        .input("descripcion",  sql.NVarChar(sql.MAX), descripcion)
        .input("agente_id",    sql.Int,            agente_id) 
        .input("lob",          sql.NVarChar(100),  lob)
        .input("nivel",        sql.Int,            nivel)
        // ⬇⬇ MANDAR COMO NVARCHAR(10) dd/MM/yyyy PARA EL SP
        .input("fecha_inicio", sql.NVarChar(10),   inicioFmt || null)
        .input("fecha_cierre", sql.NVarChar(10),   cierreFmt || null)
        .input("solucion_txt", sql.NVarChar(sql.MAX), solucion)
        .input("departamento", sql.NVarChar(100),  departamento)
        .execute("[dbo].[sp_caso_crear]");
    } catch (e1) {
      const msg = (e1 && e1.message) ? e1.message.toLowerCase() : "";
      const looksParamIssue =
        msg.includes("@departamento") ||
        msg.includes("expects parameter") ||
        msg.includes("too many arguments") ||
        msg.includes("parámetro") ||
        msg.includes("parameter");
      if (!looksParamIssue) throw e1;

      usedFallback = true;
      rs = await pool.request()
        .input("numero_caso",  sql.VarChar(40),    numero_caso || null)
        .input("asunto",       sql.VarChar(200),   asunto)
        .input("descripcion",  sql.NVarChar(sql.MAX), descripcion)
        .input("agente_id",    sql.Int,            agente_id)
        .input("lob",          sql.NVarChar(100),  lob)
        .input("nivel",        sql.Int,            nivel)
        .input("fecha_inicio", sql.NVarChar(10),   inicioFmt || null)
        .input("fecha_cierre", sql.NVarChar(10),   cierreFmt || null)
        .input("solucion_txt", sql.NVarChar(sql.MAX), solucion)
        .execute("[dbo].[sp_caso_crear]");
    }

    const id = rs?.recordset?.[0]?.id_caso;
    if (!id) {
      context.res = { status: 500, body: { error: "No se recibió id_caso desde el SP." } };
      return;
    }

    // ====== Post-acciones ======
    if (departamento) {
      await pool.request()
        .input("id",   sql.Int, id)
        .input("dpto", sql.NVarChar(100), departamento)
        .query(`
          UPDATE dbo.caso
          SET departamento = @dpto
          WHERE id_caso = @id
            AND (departamento IS NULL OR departamento <> @dpto);
        `);
    }

    if (solucion.trim().length > 0) {
      const solRs = await pool.request()
        .input("id", sql.Int, id)
        .query("SELECT TOP 1 id_solucion FROM dbo.solucion WHERE caso_id = @id ORDER BY id_solucion DESC;");
      if (!solRs.recordset || solRs.recordset.length === 0) {
        await pool.request()
          .input("id", sql.Int, id)
          .input("resumen", sql.NVarChar(200), solucion.substring(0, 200))
          .input("pasos", sql.NVarChar(sql.MAX), solucion)
          .input("resuelto_por", sql.Int, agente_id || null)
          .query(`
            INSERT INTO dbo.solucion (caso_id, resumen, pasos, resuelto_por_id, fecha_resolucion)
            VALUES (@id, @resumen, @pasos, @resuelto_por, SYSUTCDATETIME());
          `);
      } else if (agente_id) {
        await pool.request()
          .input("id", sql.Int, id)
          .input("ag", sql.Int, agente_id)
          .query(`
            UPDATE s
            SET s.resuelto_por_id = @ag,
                s.fecha_resolucion = ISNULL(s.fecha_resolucion, SYSUTCDATETIME())
            FROM dbo.solucion s
            WHERE s.caso_id = @id
              AND (s.resuelto_por_id IS NULL OR s.resuelto_por_id <> @ag);
          `);
      }
    }

    // C) **Auditar creador del caso** (solo creado_por_id si existe)
    const chk = await pool.request()
      .input("tbl", sql.NVarChar(128), "dbo.caso")
      .input("col", sql.NVarChar(128), "creado_por_id")
      .query(`
        SELECT 1 AS exists_col
        FROM sys.columns 
        WHERE object_id = OBJECT_ID(@tbl) AND name = @col;
      `);

    const hasCreadoPor = chk.recordset?.length > 0;
    if (hasCreadoPor) {
      await pool.request()
        .input("id",  sql.Int, id)
        .input("uid", sql.Int, Number(creator.id))
        .query(`
          UPDATE dbo.caso
          SET creado_por_id = @uid
          WHERE id_caso = @id
            AND (creado_por_id IS NULL OR creado_por_id <> @uid);
        `);
    }

    // ====== Obtener y devolver también el numero_caso ======
    let numero_caso_db = null;
    try {
      const rsNum = await pool.request()
        .input("id", sql.Int, id)
        .query("SELECT numero_caso FROM dbo.caso WHERE id_caso = @id;");
      numero_caso_db = rsNum.recordset?.[0]?.numero_caso ?? null;
    } catch {
    }
    const numero_caso_out = numero_caso_db || numero_caso || null;

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { ok: true, id_caso: id, numero_caso: numero_caso_out, usedFallback }
    };
  } catch (err) {
    context.log.error("POST /api/casos/create ERROR:", err);

    // Violación de índice único (duplicado)
    const sqlNum =
      err?.number ??
      err?.code ??
      err?.originalError?.info?.number ?? null;

    const isDup =
      sqlNum === 2601 ||
      sqlNum === 2627 ||
      /duplicate key|violation of unique/i.test(err?.message || '') ||
      /UX_caso_numero_inicio_cierre/i.test(err?.message || '');

    if (isDup) {
      context.res = {
        status: 409,
        headers: { "Content-Type": "application/json" },
        body: {
          error: "DUPLICATE_CASE",
          detail: "Ya existe un caso con el mismo número, fecha de inicio y cierre."
        }
      };
      return;
    }

    const msg = err?.originalError?.info?.message || err.message || "Error creando el caso";
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: msg }
    };
  }
};
