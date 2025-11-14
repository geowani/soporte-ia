// /api/casos-ultimos/index.js
const { getPool, sql } = require("../_db");

// Convierte Date o string de fecha a "YYYY-MM-DD HH:mm:ss.mmm" (horario local)
function toLocalString(value) {
  if (!value) return null;

  let d;
  if (value instanceof Date) {
    d = value;
  } else {
    // Normaliza strings comunes: "YYYY-MM-DD HH:mm:ss"
    const s = String(value);
    const normalized = s.includes("T") ? s.replace("Z", "") : s.replace(" ", "T");
    d = new Date(normalized);
  }
  if (Number.isNaN(d.getTime())) return null;

  const pad = (n, w = 2) => String(n).padStart(w, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  const ms = pad(d.getMilliseconds(), 3);
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}.${ms}`;
}

module.exports = async function (context, req) {
  try {
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "10", 10), 1),
      500
    );

    const pool = await getPool();
    const rs = await pool
      .request()
      .input("limit", sql.Int, limit)
      .execute("[dbo].[sp_caso_ultimos]");

    const items = (rs.recordset || []).map(r => ({
      numero_caso:    r.numero_caso,
      titulo_pref:    r.titulo_pref,
      creado_por:     r.creado_por,
      fecha_creacion: r.fecha_creacion,          // se mantiene por compatibilidad
      creado_en:      toLocalString(r.creado_en) // Fecha de agregado al sistema
    }));

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { items, limit }
    };
  } catch (err) {
    context.log.error("GET /api/casos/ultimos ERROR:", err);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: "Error al listar últimos casos" }
    };
  }
};
