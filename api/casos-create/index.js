// POST /api/casos/create
const { getPool, sql } = require("../_db");

module.exports = async function (context, req) {
  try {
    const body = (req.body || {});

    // ====== Campos del formulario ======
    const numero_caso = (body.caso ?? "").toString().trim();                  // opcional: si va vacío, el SP autogenera
    const asunto      = (body.asunto ?? body.titulo ?? "").toString().trim(); // obligatorio
    const descripcion = (body.descripcion ?? "").toString();
    const solucion    = (body.solucion ?? "").toString();
    const lob         = (body.lob ?? "").toString().trim() || null;

    const nivel = (body.nivel !== undefined && body.nivel !== "" && !Number.isNaN(parseInt(body.nivel,10)))
      ? parseInt(body.nivel,10) : null;

    const agente_id = (body.agente !== undefined && body.agente !== "" && !Number.isNaN(parseInt(body.agente,10)))
      ? parseInt(body.agente,10) : null;

    const inicio = (body.inicio ?? "").toString().trim() || null;  // dd/MM/yyyy
    const cierre = (body.cierre ?? "").toString().trim() || null;  // dd/MM/yyyy

    // Normaliza/valida departamento (acepta vacío o NET|SYS|PC|HW)
    const rawDept = (body.departamento ?? "").toString().toUpperCase().trim();
    const allowedDepts = new Set(["NET", "SYS", "PC", "HW"]);
    const departamento = allowedDepts.has(rawDept) ? rawDept : null;

    // Logs rápidos de depuración
    context.log("create-caso payload =>", {
      asunto, nivel, agente_id, departamento, tieneSolucion: solucion.trim().length > 0
    });

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

    // ====== Intento 1: llamar SP con @departamento (si tu SP ya lo soporta) ======
    let rs, usedFallback = false;
    try {
      rs = await pool.request()
        .input("numero_caso",  sql.VarChar(40),    numero_caso || null)
        .input("asunto",       sql.VarChar(200),   asunto)
        .input("descripcion",  sql.NVarChar(sql.MAX), descripcion)
        .input("agente_id",    sql.Int,            agente_id)
        .input("lob",          sql.NVarChar(100),  lob)
        .input("nivel",        sql.Int,            nivel)
        .input("fecha_inicio", sql.NVarChar(10),   inicio)   // dd/MM/yyyy
        .input("fecha_cierre", sql.NVarChar(10),   cierre)   // dd/MM/yyyy
        .input("solucion_txt", sql.NVarChar(sql.MAX), solucion)
        .input("departamento", sql.NVarChar(100),  departamento) // <--- nuevo
        .execute("[dbo].[sp_caso_crear]");
    } catch (e1) {
      // Si el SP no tiene @departamento, reintenta sin ese parámetro
      const msg = (e1 && e1.message) ? e1.message.toLowerCase() : "";
      const looksParamIssue =
        msg.includes("@departamento") ||
        msg.includes("expects parameter") ||
        msg.includes("too many arguments") ||
        msg.includes("parámetro") ||
        msg.includes("parameter");

      if (!looksParamIssue) throw e1; // otro error real

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

    // ====== Post-acciones (siempre que haya id) ======

    // A) Forzar departamento si vino en el body (independiente de fallback)
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

    // B) Si vino SOLUCIÓN y (opcionalmente) hay AGENTE, asegurar fila en solucion y setear resuelto_por
    if (solucion.trim().length > 0) {
      // 1) ¿Existe ya solucion del SP?
      const solRs = await pool.request()
        .input("id", sql.Int, id)
        .query("SELECT TOP 1 id_solucion FROM dbo.solucion WHERE caso_id = @id ORDER BY id_solucion DESC;");

      // 2) Verificar si el agente existe
      let agenteOk = null;
      if (agente_id) {
        const agRs = await pool.request()
          .input("ag", sql.Int, agente_id)
          .query("SELECT COUNT(1) AS ok FROM dbo.usuario WHERE id_usuario = @ag;");
        agenteOk = (agRs.recordset?.[0]?.ok > 0) ? agente_id : null;
      }

      if (!solRs.recordset || solRs.recordset.length === 0) {
        // No hay solución: la creo
        await pool.request()
          .input("id", sql.Int, id)
          .input("resumen", sql.NVarChar(200), solucion.substring(0, 200))
          .input("pasos", sql.NVarChar(sql.MAX), solucion)
          .input("resuelto_por", sql.Int, agenteOk)
          .query(`
            INSERT INTO dbo.solucion (caso_id, resumen, pasos, resuelto_por_id, fecha_resolucion)
            VALUES (@id, @resumen, @pasos, @resuelto_por, SYSUTCDATETIME());
          `);
      } else if (agenteOk) {
        // Ya hay solución: actualizo resuelto_por si falta
        await pool.request()
          .input("id", sql.Int, id)
          .input("ag", sql.Int, agenteOk)
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

    // ====== Respuesta ======
    context.log("CREADO_id=", id, "DEPTO=", departamento, "AGENTE=", agente_id, "HAY_SOL=", (solucion.trim().length>0));
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
