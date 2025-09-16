// POST /api/casos/create
const { getPool, sql } = require("../_db");

module.exports = async function (context, req) {
  try {
    const body = (req.body || {});

    // ====== Campos del formulario ======
    const numero_caso = (body.caso ?? "").toString().trim();                  // opcional
    const asunto      = (body.asunto ?? body.titulo ?? "").toString().trim(); // obligatorio
    const descripcion = (body.descripcion ?? "").toString();
    const solucion    = (body.solucion ?? "").toString();
    const lob         = (body.lob ?? "").toString().trim() || null;

    const nivel = (body.nivel !== undefined && body.nivel !== "" && !Number.isNaN(parseInt(body.nivel,10)))
      ? parseInt(body.nivel,10) : null;

    const inicio = (body.inicio ?? "").toString().trim() || null;  // dd/MM/yyyy
    const cierre = (body.cierre ?? "").toString().trim() || null;  // dd/MM/yyyy

    // Departamento: NET|SYS|PC|HW o null
    const rawDept = (body.departamento ?? "").toString().toUpperCase().trim();
    const allowedDepts = new Set(["NET","SYS","PC","HW"]);
    const departamento = allowedDepts.has(rawDept) ? rawDept : null;

    // === Agente: permitir id o nombre ===
    let agente_id = null;
    let agente_nombre = (body.agente_nombre ?? "").toString().trim();
    const agente_raw = (body.agente ?? "").toString().trim();

    if (agente_raw) {
      if (/^\d+$/.test(agente_raw)) agente_id = parseInt(agente_raw, 10);
      else agente_nombre = agente_raw; // venía como texto en 'agente'
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

    // Si NO vino id pero SÍ nombre, resuélvelo a id
    if (!agente_id && agente_nombre) {
      const rsAg = await pool.request()
        .input("q", sql.NVarChar(200), agente_nombre)
        .input("like", sql.NVarChar(210), `%${agente_nombre}%`)
        .query(`
          -- Exacto primero
          ;WITH cte AS (
            SELECT id_usuario,
                   1 AS score
            FROM dbo.usuario
            WHERE nombre = @q OR nombre_completo = @q
            UNION ALL
            SELECT TOP 1 id_usuario, 0 AS score
            FROM dbo.usuario
            WHERE nombre LIKE @like OR nombre_completo LIKE @like
            ORDER BY nombre
          )
          SELECT TOP 1 id_usuario FROM cte ORDER BY score DESC, id_usuario;
        `);
      agente_id = rsAg.recordset?.[0]?.id_usuario || null;
    }

    // ====== Intento 1: llamar SP con @departamento ======
    let rs, usedFallback = false;
    try {
      rs = await pool.request()
        .input("numero_caso",  sql.VarChar(40),    numero_caso || null)
        .input("asunto",       sql.VarChar(200),   asunto)
        .input("descripcion",  sql.NVarChar(sql.MAX), descripcion)
        .input("agente_id",    sql.Int,            agente_id) // <- puede ser null
        .input("lob",          sql.NVarChar(100),  lob)
        .input("nivel",        sql.Int,            nivel)
        .input("fecha_inicio", sql.NVarChar(10),   inicio)
        .input("fecha_cierre", sql.NVarChar(10),   cierre)
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
        .input("fecha_inicio", sql.NVarChar(10),   inicio)
        .input("fecha_cierre", sql.NVarChar(10),   cierre)
        .input("solucion_txt", sql.NVarChar(sql.MAX), solucion)
        .execute("[dbo].[sp_caso_crear]");
    }

    const id = rs?.recordset?.[0]?.id_caso;
    if (!id) {
      context.res = { status: 500, body: { error: "No se recibió id_caso desde el SP." } };
      return;
    }

    // ====== Post-acciones ======
    // A) Forzar departamento si vino en el body
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

    // B) Asegurar solución y resuelto_por (si mandaste solución)
    if (solucion.trim().length > 0) {
      const solRs = await pool.request()
        .input("id", sql.Int, id)
        .query("SELECT TOP 1 id_solucion FROM dbo.solucion WHERE caso_id = @id ORDER BY id_solucion DESC;");
      // si no hay, la creo
      if (!solRs.recordset || solRs.recordset.length === 0) {
        await pool.request()
          .input("id", sql.Int, id)
          .input("resumen", sql.NVarChar(200), solucion.substring(0,200))
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

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { ok: true, id_caso: id }
    };
  } catch (err) {
    context.log.error("POST /api/casos/create ERROR:", err);
    const msg = err?.originalError?.info?.message || err.message || "Error creando el caso";
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: msg }
    };
  }
};
