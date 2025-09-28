const sql = require('mssql');

const sqlConfig = {
  connectionString: process.env.SQL_CONN_STR,
  options: { encrypt: true }
};

async function askOpenAI(q) {
  const key = process.env.OPENAI_API_KEY || '';
  const payload = {
    model: 'gpt-4o-mini',
    temperature: 0.3,
    messages: [
      { role: 'system', content: 'Eres un asistente de soporte. Si hay BD respétala; si no, da pasos prácticos claros.' },
      { role: 'user', content: `No hubo resultados en BD para: "${q}". Da una guía breve y accionable.` }
    ]
  };
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const j = await r.json();
  return j?.choices?.[0]?.message?.content ?? '(sin respuesta del modelo)';
}

module.exports = async function (context, req) {
  try {
    const { q, userId } = req.body || {};
    if (!q || !q.trim()) {
      context.res = { status: 400, body: { error: 'Falta q' } };
      return;
    }

    let resultados = [];
    try {
      const pool = await sql.connect(sqlConfig);
      const r = await pool.request()
        .input('q', sql.NVarChar, q)
        .input('page', sql.Int, 1)
        .input('pageSize', sql.Int, 3)
        .execute('sp_caso_buscar_front');
      resultados = r.recordset || [];
    } catch (err) {
      context.log('SQL ERROR:', err?.message || err);
      resultados = [];
    }

    if (resultados.length > 0) {
      const top = resultados[0];
      const bullets = resultados.map((c, i) =>
        `- #${i+1} ${c.codigo}: ${c.titulo} (${c.sistema}/${c.sistema_det})`).join('\n');

      context.res = {
        status: 200,
        body: {
          query: q,
          casoSugeridoId: top.id,
          answer:
`Encontré casos relacionados en la base de datos:

${bullets}

Sugerencia principal: **${top.codigo} – ${top.titulo}**
Resumen: ${top.descripcion}`
        }
      };
      return;
    }

    const ai = await askOpenAI(q);
    context.res = { status: 200, body: { query: q, casoSugeridoId: null, answer: `(Generado con IA)\n\n${ai}` } };
  } catch (e) {
    context.log(e);
    context.res = { status: 500, body: { error: 'Error procesando la solicitud' } };
  }
};
