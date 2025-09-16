// POST /api/casos/create
const { getPool, sql } = require("../_db");

module.exports = async function (context, req) {
  try {
    const body = (req.body || {});

    // Campos que vienen del formulario
    const numero_caso = (body.caso || "").trim();                          // opcional: si va vacío, el SP autogenera
    const nivel       = body.nivel ? parseInt(body.nivel, 10) : null;       // 1..3 o null
    const agente_id   = body.agente ? parseInt(body.agente, 10) : null;     // opcional
    const lob         = (body.lob || "").trim() || null;
    const inicio      = (body.inicio || "").trim() || null;                 // dd/MM/yyyy
    const cierre      = (body.cierre || "").trim() || null;                 // dd/MM/yyyy
    const asunto      = (body.asunto || body.titulo || "").trim();          // obligatorio
    const descripcion = (body.descripcion || "").toString();
    const solucion    = (body.solucion || "").toString();

    // Normalizar/validar departamento (acepta vacío o NET|SYS|PC|HW)
    const rawDept = (body.departamento || "").toString().toUpperCase().trim();
    const allowedDepts = new Set(["NET", "SYS", "PC", "HW"]);
    const departamento = allowedDepts.has(rawDept) ? rawDept : null;

    // Validaciones simples para principiantes
    if (!asunto) {
      context.res = { status: 400, body: { error: "El campo 'asunto' (título) es obligatorio." } };
      return;
    }

    const pool = await getPool();

    // ---- Intento 1: llamar SP con @departamento (si tu SP ya lo soporta)
    let rs, usedFallback = false;
    try {
      rs = await pool.request()
        .input("numero_caso",  sql.VarChar(40),   numero_caso || null)
        .input("asunto",       sql.VarChar(200),  asunto)
        .input("descripcion",  sql.NVarChar(sql.MAX), descripcion)
        .input("agente_id",    sql.Int,           agente_id)
        .input("lob",          sql.NVarChar(100), lob)
        .input("nivel",        sql.Int,           nivel)
        .input("fecha_inicio", sql.NVarChar(10),  inicio)   // dd/MM/yyyy
        .input("fecha_cierre", sql.NVarChar(10),  cierre)   // dd/MM/yyyy
        .input("solucion_txt", sql.NVarChar(sql.MAX), solucion)
        .input("departamento", sql.NVarChar(100), departamento) // <--- nuevo
        .execute("[dbo].[sp_caso_crear]");
    } catch (e1) {
      // Si el SP no tiene @departamento, reintenta sin ese parámetro
      const msg = (e1 && e1.message) ? e1.message.toLowerCase() : "";
      const looksParamIssue =
        msg.includes("@departamento") ||
        msg.includes("expects parameter") ||
        msg.includes("too many arguments") ||
        msg.includes("no se encontró el procedimiento") ||
        msg.includes("parámetro");

      if (!looksParamIssue) throw e1; // otro error real

      usedFallback = true;
      rs = await pool.request()
        .input("numero_caso",  sql.VarChar(40),   numero_caso || null)
        .input("asunto",       sql.VarChar(200),  asunto)
        .input("descripcion",  sql.NVarChar(sql.MAX), descripcion)
        .input("agente_id",    sql.Int,           agente_id)
        .input("lob",          sql.NVarChar(100), lob)
        .input("nivel",        sql.Int,           nivel)
        .input("fecha_inicio", sql.NVarChar(10),  inicio)
        .input("fecha_cierre", sql.NVarChar(10),  cierre)
        .input("solucion_txt", sql.NVarChar(sql.MAX), solucion)
        .execute("[dbo].[sp_caso_crear]");
    }

    const id = rs?.recordset?.[0]?.id_caso;

    // Si caímos al fallback y sí hay departamento, actualiza el registro recién creado
    if (usedFallback && id && departamento) {
      await pool.request()
        .input("id", sql.Int, id)
        .input("dpto", sql.NVarChar(100), departamento)
        .query("UPDATE dbo.caso SET departamento = @dpto WHERE id_caso = @id;");
    }

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { ok: true, id_caso: id || null }
    };
  } catch (err) {
    // Log y error legible
    context.log.error("POST /api/casos/create ERROR:", err);
    const msg = err?.originalError?.info?.message || err.message || "Error creando el caso";
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: msg }
    };
  }
};
