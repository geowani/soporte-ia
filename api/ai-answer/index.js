import sql from 'mssql';
import fetch from 'node-fetch';

const sqlConfig = {
  connectionString: process.env.SQL_CONN_STR,
  options: { encrypt: true }
};

export default async function (context, req) {
  try {
    const { q, userId } = req.body || {};
    if (!q || !q.trim()) {
      context.res = { status: 400, jsonBody: { error: 'Falta q' } };
      return;
    }

    // --- 1) Buscar en BD ---
    const pool = await sql.connect(sqlConfig);
    const r = await pool.request()
      .input('q', sql.NVarChar, q)
      .input('page', sql.Int, 1)
      .input('pageSize', sql.Int, 3)
      .execute('sp_caso_buscar_front');

    const resultados = r.recordset || [];

    if (resultados.length > 0) {
      const top = resultados[0];
      const bullets = resultados.map((c, i) =>
        `- #${i+1} ${c.codigo}: ${c.titulo} (${c.sistema}/${c.sistema_det})`).join('\n');

      context.res = {
        jsonBody: {
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

    // --- 2) Si no hay en BD → preguntar a OpenAI ---
    const key = process.env.OPENAI_API_KEY;
    const body = {
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        { role: 'system', content: 'Eres un asistente de soporte. Si hay datos de BD respétalos; si no, da pasos prácticos y claros.' },
        { role: 'user', content: `No hubo resultados en BD para: "${q}". Da una guía práctica.` }
      ]
    };
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await resp.json();
    const ai = json?.choices?.[0]?.message?.content ?? '(sin respuesta del modelo)';

    context.res = {
      jsonBody: { query: q, casoSugeridoId: null, answer: `(Generado con IA)\n\n${ai}` }
    };
  } catch (e) {
    context.log(e);
    context.res = { status: 500, jsonBody: { error: 'Error procesando la solicitud' } };
  }
}
