const { getPool, sql } = require("../_db");

function parseCookies(cookieHeader = "") {
  const out = {};
  cookieHeader.split(";").forEach(p => {
    const i = p.indexOf("=");
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function readUserId(req) {
  const h = req?.headers || {};
  const cookies = parseCookies(h.cookie || "");

  const candidates = [
    h["x-user-id"],
    h["x-agent-id"],                 
    req?.body?.usuarioId,
    req?.body?.agenteId,          
    req?.body?.user?.id_usuario,    
    req?.body?.user?.id,
    cookies["agent_id"],        
  ];

  for (const v of candidates) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

module.exports = async function (context, req) {
  try {
    const pool = await getPool();
    const usuarioId  = readUserId(req);
    const textoQuery = String(req.body?.q ?? "").trim();
    const casoId     = req.body?.casoId != null ? Number(req.body.casoId) : null;
    const score      = req.body?.score != null ? Number(req.body.score) : null;

    if (!textoQuery) {
      context.res = { status: 400, body: { error: "q (texto de búsqueda) requerido" } };
      return;
    }

    const rs = await pool.request()
      .input("usuario_id", sql.Int, usuarioId)
      .input("texto_query", sql.NVarChar(sql.MAX), textoQuery)
      .input("caso_id", sql.Int, casoId)
      .input("score_similitud", sql.Decimal(5,4), score)
      .execute("dbo.sp_busqueda_evento_registrar");

    const id = rs?.recordset?.[0]?.id_busqueda_evento ?? null;
    context.res = { status: 200, headers: { "Content-Type": "application/json" }, body: { ok: true, id } };
  } catch (err) {
    context.log.error("POST /api/busqueda-evento-registrar ERROR:", err);
    context.res = { status: 500, body: { error: "Error registrando búsqueda" } };
  }
};
