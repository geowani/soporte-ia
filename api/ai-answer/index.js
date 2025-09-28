// api/ai-answer/index.js  (CommonJS)
const sql = require('mssql');

// --- convierte la cadena ADO.NET en config que entiende mssql ---
function parseConnStr(connStr = "") {
  const parts = {};
  connStr.split(';').forEach(p => {
    const [k, v] = p.split('=');
    if (!k || !v) return;
    parts[k.trim().toLowerCase()] = v.trim();
  });
  return {
    server: (parts["server"] || "").replace("tcp:", "").split(",")[0],
    port: parts["server"]?.includes(",") ? parseInt(parts["server"].split(",")[1]) : 1433,
    database: parts["database"],
    user: parts["user id"],
    password: parts["password"],
    options: {
      encrypt: (parts["encrypt"] || "true").toLowerCase() === "true",
      trustServerCertificate: (parts["trustservercertificate"] || "false").toLowerCase() === "true"
    }
  };
}

const sqlConfig = parseConnStr(process.env.SQL_CONN_STR || "");

// --- llamada simple a OpenAI (Node 18 ya tiene fetch nativo) ---
async function askOpenAI(q) {
  const key = process.env.OPENAI_API_KEY || '';
  const payload = {
    model: 'gpt-4o-mini',
    temperature: 0.3,
    messages: [
      { role: 'system', content: 'Eres un asistente de soporte. Si hay BD respétala; si no, da pasos prácticos y claros.' },
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
    let sqlError = null;

    // --- 1) Buscar en la BD con tu SP sp_caso_buscar_front ---
    try {
      const pool = await sql.connect(sqlConfig);
      const r = await pool.request()
        .input('q', sql.NVarChar, q)
        .input('page', sql.Int, 1)
        .input('pageSize', sql.Int, 3)
        .execute('dbo.sp_caso_buscar_front'); // alias esperados: id, codigo, titulo, descripcion, sistema, sistema_det, fecha_creacion
      resultados = r.recordset || [];
    } catch (err) {
      sqlError = String(err?.message || err);
      context.log('SQL ERROR:', sqlError);
      resultados = [];
    }

    // --- 2) Si hay resultados, responde con BD ---
    if (resultados.length > 0) {
      const top = resultados[0];
      const bullets = resultados.map((c, i) =>
        `- #${i+1} ${c.codigo}: ${c.titulo} (${c.sistema || ''}/${c.sistema_det || ''})`).join('\n');

      context.res = {
        status: 200,
        body: {
          mode: "db",
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

    // --- 3) Si no hay BD, genera con IA ---
    const ai = await askOpenAI(q);
    context.res = {
      status: 200,
      body: {
        mode: "ai",
        query: q,
        casoSugeridoId: null,
        answer: `(Generado con IA)\n\n${ai}`,
        sqlError // útil para diagnóstico si alguna vez falla la BD
      }
    };
  } catch (e) {
    context.log(e);
    context.res = { status: 500, body: { error: 'Error procesando la solicitud' } };
  }
};
