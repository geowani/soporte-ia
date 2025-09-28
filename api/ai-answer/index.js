// api/ai-answer/index.js  (CommonJS con Gemini)
const sql = require('mssql');

/* ------------------ SQL: parsear cadena ADO.NET ------------------ */
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

/* ------------------ IA: Gemini ------------------ */
async function askGemini(q) {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) return "[Gemini] Falta GEMINI_API_KEY";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${encodeURIComponent(key)}`;

  const prompt = `Eres un asistente de soporte técnico. No hubo resultados en BD para: "${q}". 
Responde con pasos claros, breves y accionables.`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 512
    }
  };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return `[Gemini ${resp.status}] ${errText}`;
    }

    const data = await resp.json();
    const txt =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.candidates?.[0]?.content?.parts?.map(p => p?.text || "").join("\n");

    return (txt && txt.trim()) ? txt : "[Gemini] respuesta vacía";
  } catch (e) {
    return `[Gemini ex] ${e?.message || e}`;
  }
}

/* ------------------ Handler principal ------------------ */
module.exports = async function (context, req) {
  try {
    const { q, userId, forceAi } = req.body || {};
    if (!q || !q.trim()) {
      context.res = { status: 400, body: { error: "Falta q" } };
      return;
    }

    // Si se pide forzar IA, saltar BD
    if (forceAi === true) {
      const ai = await askGemini(q);
      context.res = {
        status: 200,
        body: { mode: "ai", query: q, casoSugeridoId: null, answer: `(Generado con IA)\n\n${ai}` }
      };
      return;
    }

    /* 1) Buscar en BD */
    let resultados = [];
    let sqlError = null;

    try {
      const pool = await sql.connect(sqlConfig);
      const r = await pool.request()
        .input("q", sql.NVarChar, q)
        .input("page", sql.Int, 1)
        .input("pageSize", sql.Int, 3)
        .execute("dbo.sp_caso_buscar_front");
      resultados = r.recordset || [];
    } catch (err) {
      sqlError = String(err?.message || err);
      context.log("SQL ERROR:", sqlError);
      resultados = [];
    }

    /* 2) Si hay resultados -> BD */
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

    /* 3) Si no hay BD -> Gemini */
    const ai = await askGemini(q);
    context.res = {
      status: 200,
      body: {
        mode: "ai",
        query: q,
        casoSugeridoId: null,
        answer: `(Generado con IA)\n\n${ai}`,
        sqlError
      }
    };
  } catch (e) {
    context.log(e);
    context.res = { status: 500, body: { error: "Error procesando la solicitud" } };
  }
};
