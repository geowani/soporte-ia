// api/ai-answer/index.js  (CommonJS + Gemini v1 con autodetección de modelo)
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

/* ------------------ IA: Gemini (autodetecta modelo y usa API v1) ------------------ */
async function askGemini(q) {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) return "[Gemini] Falta GEMINI_API_KEY";

  // 0) Lista modelos disponibles para tu key
  let available = [];
  try {
    const list = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(key)}`);
    if (list.ok) {
      const data = await list.json();
      available = Array.isArray(data.models) ? data.models.map(m => m.name) : [];
    }
  } catch (_) { /* ignore listing errors */ }

  // 1) Construye candidatos (preferimos 2.5 flash → 2.5 pro → 1.5 flash → 1.5 pro)
  const prefer = [
    "models/gemini-2.5-flash-latest",
    "models/gemini-2.5-flash",
    "models/gemini-2.5-pro-latest",
    "models/gemini-2.5-pro",
    "models/gemini-1.5-flash-latest",
    "models/gemini-1.5-flash",
    "models/gemini-1.5-pro-latest",
    "models/gemini-1.5-pro"
  ];

  const fromList = [
    ...available.filter(n => /gemini\-2\.5.*flash/i.test(n)),
    ...available.filter(n => /gemini\-2\.5.*pro/i.test(n)),
    ...available.filter(n => /gemini\-1\.5.*flash/i.test(n)),
    ...available.filter(n => /gemini\-1\.5.*pro/i.test(n)),
  ];

  const seen = new Set();
  const candidates = [...fromList, ...prefer].filter(n => {
    if (!n) return false;
    if (seen.has(n)) return false;
    seen.add(n); return true;
  });

  if (candidates.length === 0) {
    return "[Gemini] No hay modelos disponibles para esta API key (endpoint /v1/models vacío).";
  }

  // 2) Payload
  const prompt = `Eres un asistente de soporte técnico. 
No hubo resultados en BD para: "${q}". 
Responde con pasos claros, breves y accionables, en formato de lista numerada o viñetas.
No incluyas frases de cierre como "háznoslo saber", "contáctame", "puedo ayudarte más" ni invitaciones a interacción humana. 
Entrega solo la solución técnica y concreta.`;


  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 512 }
  };

  // 3) Prueba candidatos hasta que uno funcione
  let lastErr = null;

  for (const modelName of candidates) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1/${modelName}:generateContent?key=${encodeURIComponent(key)}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        lastErr = `[Gemini ${resp.status}] ${(await resp.text()).slice(0, 800)}`;
        // 404/400 por modelo no soportado → intenta el siguiente candidato
        continue;
      }

      const data = await resp.json();
      const txt =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        (data?.candidates?.[0]?.content?.parts || []).map(p => p?.text || "").join("\n");

      if (txt && txt.trim()) return txt;
      lastErr = "[Gemini] respuesta vacía";
    } catch (e) {
      lastErr = `[Gemini ex] ${e?.message || e}`;
    }
  }

  const hint = available.length ? ` Modelos detectados: ${available.slice(0,8).join(", ")}` : "";
  return `${lastErr || "[Gemini] sin respuesta"}${hint}`;
}

/* ------------------ Handler principal ------------------ */
module.exports = async function (context, req) {
  try {
    const { q, userId, forceAi } = req.body || {};
    if (!q || !q.trim()) {
      context.res = { status: 400, body: { error: "Falta q" } };
      return;
    }

    // IA directa (forzar Gemini para pruebas)
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
        answer: `Respuesta generada con inteligencia artificial:\n\n${ai}`,
        sqlError
      }
    };
  } catch (e) {
    context.log(e);
    context.res = { status: 500, body: { error: "Error procesando la solicitud" } };
  }
};
