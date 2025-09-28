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

// --- Llamada a OpenAI con fallback robusto ---
async function askOpenAI(q) {
  const key = (process.env.OPENAI_API_KEY || "").trim();
  if (!key) return "[OpenAI] Falta OPENAI_API_KEY";

  const messages = [
    { role: "system", content: "Eres un asistente de soporte. Si hay BD respétala; si no, da pasos prácticos y claros." },
    { role: "user", content: `No hubo resultados en BD para: "${q}". Da una guía breve y accionable.` }
  ];

  // 1) Intento con Chat Completions
  try {
    const r1 = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini", temperature: 0.3, messages })
    });
    if (r1.ok) {
      const d1 = await r1.json();
      const text = d1?.choices?.[0]?.message?.content;
      if (text && text.trim()) return text;
    } else {
      const errText = await r1.text();
      console.log("OpenAI chat/completions error:", r1.status, errText);
    }
  } catch (e) {
    console.log("OpenAI chat/completions exception:", e?.message || e);
  }

  // 2) Fallback: Responses API
  try {
    const r2 = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        input: `Eres un asistente de soporte. No hubo resultados en BD para: "${q}". Da una guía breve y accionable.`
      })
    });
    if (!r2.ok) {
      const errText = await r2.text();
      return `[OpenAI responses ${r2.status}] ${errText}`;
    }
    const d2 = await r2.json();
    const outputText =
      d2.output_text ||
      (Array.isArray(d2.output)
        ? d2.output.map(p => p?.content?.[0]?.text?.value || "").join("\n")
        : null) ||
      d2?.choices?.[0]?.message?.content ||
      null;

    return outputText && outputText.trim()
      ? outputText
      : "[OpenAI] respuesta vacía en /responses";
  } catch (e) {
    return `[OpenAI responses ex] ${e?.message || e}`;
  }
}

module.exports = async function (context, req) {
  try {
    const { q, userId, forceAi } = req.body || {};
    if (!q || !q.trim()) {
      context.res = { status: 400, body: { error: "Falta q" } };
      return;
    }

    // Permite forzar IA para pruebas
    if (forceAi === true) {
      const ai = await askOpenAI(q);
      context.res = { status: 200, body: { mode: "ai", query: q, casoSugeridoId: null, answer: `(Generado con IA)\n\n${ai}` } };
      return;
    }

    let resultados = [];
    let sqlError = null;

    // --- 1) Buscar en la BD con tu SP sp_caso_buscar_front ---
    try {
      const pool = await sql.connect(sqlConfig);
      const r = await pool.request()
        .input("q", sql.NVarChar, q)
        .input("page", sql.Int, 1)
        .input("pageSize", sql.Int, 3)
        .execute("dbo.sp_caso_buscar_front"); // devuelve: id, codigo, titulo, descripcion, sistema, sistema_det, fecha_creacion
      resultados = r.recordset || [];
    } catch (err) {
      sqlError = String(err?.message || err);
      context.log("SQL ERROR:", sqlError);
      resultados = [];
    }

    // --- 2) Si hay resultados, responde con BD ---
    if (resultados.length > 0) {
      const top = resultados[0];
      const bullets = resultados.map((c, i) =>
        `- #${i + 1} ${c.codigo}: ${c.titulo} (${c.sistema || ""}/${c.sistema_det || ""})`).join("\n");

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
    context.res = { status: 500, body: { error: "Error procesando la solicitud" } };
  }
};
