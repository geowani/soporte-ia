const { getPool, sql } = require("../_db");

function readUserId(req) {
  const headerId = req?.headers?.["x-user-id"];
  const bodyId   = req?.body?.usuarioId;
  const userId   = Number(headerId ?? bodyId ?? NaN);
  return Number.isFinite(userId) ? userId : null;
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

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { ok: true, id }
    };
  } catch (err) {
    context.log.error("POST /api/busqueda-evento-registrar ERROR:", err);
    context.res = { status: 500, body: { error: "Error registrando búsqueda" } };
  }
};
