// api/ai-answer/index.js  (CommonJS + Gemini v1 con autodetección de modelo + continuación)
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

/* ------------------ IA: Gemini (3 alternativas concisas, con sentinela y continuación) ------------------ */

const MODELS_PREFERRED = [
  "models/gemini-2.5-flash-latest",
  "models/gemini-2.5-flash",
  "models/gemini-2.5-pro-latest",
  "models/gemini-2.5-pro",
  "models/gemini-1.5-flash-latest",
  "models/gemini-1.5-flash",
  "models/gemini-1.5-pro-latest",
  "models/gemini-1.5-pro"
];

const TEMP = 0.2;
const MAX_OUTPUT_TOKENS_FIRST = 1200; // antes 600
const MAX_OUTPUT_TOKENS_CONT  = 800;
const MAX_CONTINUATIONS       = 2;    // número de “continúa…” si vino cortado

function buildPrompt(q) {
  return `Eres un asistente de soporte técnico.
No hubo resultados en la base de datos para: "${q}".
Responde con pasos claros, breves y accionables, en formato de lista numerada o viñetas.
No incluyas frases de cierre como "háznoslo saber", "contáctame", "puedo ayudarte más" ni invitaciones a interacción humana. 

DEVUELVE EXACTAMENTE 3 ALTERNATIVAS numeradas del 1 al 3.
Para cada alternativa:
- Escribe un TÍTULO corto en UNA LÍNEA (sin adornos).
- Debajo, 3 a 5 PASOS prácticos en viñetas ("- ").
- No uses textos de cierre, disculpas ni invitaciones a interacción humana.
- No agregues nada fuera de esas tres alternativas.
- Responde en español.

FORMATO ESTRICTO:
1) <título corto>
- paso 1
- paso 2
- paso 3

2) <título corto>
- paso 1
- paso 2
- paso 3

3) <título corto>
- paso 1
- paso 2
- paso 3

Al terminar, escribe exactamente [[END]].`;
}

function buildContinuationPrompt(soFar) {
  return `Sigue EXACTAMENTE donde te quedaste para completar las 3 alternativas.
No repitas texto ya dado. Mantén el mismo formato y termina con [[END]].
Texto hasta ahora:
${soFar}`;
}

function isComplete(txt = "") {
  return /\n?\s*3\)\s/.test(txt) && /\[\[END\]\]\s*$/.test(txt);
}
function stripEnd(txt = "") {
  return txt.replace(/\s*\[\[END\]\]\s*$/, "").trim();
}

async function listModels(key) {
  try {
    const list = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(key)}`);
    if (!list.ok) return [];
    const data = await list.json();
    return Array.isArray(data.models) ? data.models.map(m => m.name) : [];
  } catch {
    return [];
  }
}

function orderCandidates(available) {
  const fromList = [
    ...available.filter(n => /gemini\-2\.5.*flash/i.test(n)),
    ...available.filter(n => /gemini\-2\.5.*pro/i.test(n)),
    ...available.filter(n => /gemini\-1\.5.*flash/i.test(n)),
    ...available.filter(n => /gemini\-1\.5.*pro/i.test(n)),
  ];
  const seen = new Set();
  return [...fromList, ...MODELS_PREFERRED].filter(n => {
    if (!n) return false;
    if (seen.has(n)) return false;
    seen.add(n);
    return true;
  });
}

function extractText(data) {
  try {
    const parts = data?.candidates?.[0]?.content?.parts || [];
    return parts.map(p => p?.text || "").join("\n");
  } catch {
    return "";
  }
}

async function callGemini({ apiKey, modelName, prompt, maxTokens }) {
  const url = `https://generativelanguage.googleapis.com/v1/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: TEMP, maxOutputTokens: maxTokens }
  };
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => "");
    throw new Error(`Gemini HTTP ${resp.status}: ${msg.slice(0, 800)}`);
  }
  const data = await resp.json();
  return (extractText(data) || "").trim();
}

/** Un solo disparo (elige el primer modelo que funcione) */
async function askGeminiOnce(q, key, available) {
  const prompt = buildPrompt(q);
  const candidates = orderCandidates(available);
  let lastErr = null;

  for (const modelName of candidates) {
    try {
      const txt = await callGemini({
        apiKey: key,
        modelName,
        prompt,
        maxTokens: MAX_OUTPUT_TOKENS_FIRST
      });
      if (txt) return txt;
      lastErr = "[Gemini] respuesta vacía";
    } catch (e) {
      lastErr = String(e?.message || e);
      // intenta siguiente modelo
    }
  }
  return lastErr || "[Gemini] sin respuesta";
}

/** Wrapper con continuación si el primer tiro no llegó a [[END]] o faltó la 3) */
async function askGeminiWithContinuation(q) {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) return "[Gemini] Falta GEMINI_API_KEY";

  const available = await listModels(key);
  let out = await askGeminiOnce(q, key, available);
  if (isComplete(out)) return stripEnd(out);

  // Si el primer intento vino corto (sin [[END]] o sin “3)”), pedimos continuar
  for (let round = 0; round < MAX_CONTINUATIONS && !isComplete(out); round++) {
    const contPrompt = buildContinuationPrompt(out);
    const candidates = orderCandidates(available);
    let appended = "";

    for (const modelName of candidates) {
      try {
        appended = await callGemini({
          apiKey: key,
          modelName,
          prompt: contPrompt,
          maxTokens: MAX_OUTPUT_TOKENS_CONT
        });
        if (appended) break;
      } catch {
        // intenta el siguiente
      }
    }

    if (appended) out = `${out}\n${appended}`.trim();
    else break; // no se pudo agregar nada útil
  }

  return stripEnd(out);
}

/* ------------------ Handler principal ------------------ */
module.exports = async function (context, req) {
  const t0 = Date.now();
  try {
    const { q, forceAi } = req.body || {};
    if (!q || !q.trim()) {
      context.res = { status: 400, body: { error: "Falta q" } };
      return;
    }

    // IA directa (forzar Gemini para pruebas)
    if (forceAi === true) {
      const ai = await askGeminiWithContinuation(q);
      context.res = {
        status: 200,
        body: {
          mode: "ai",
          query: q,
          casoSugeridoId: null,
          answer: `Respuesta generada con inteligencia artificial:\n\n${ai}`,
          debug: {
            len: ai.length,
            ended: /\[\[END\]\]\s*$/.test(ai),
            ms: Date.now() - t0
          }
        }
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

    /* 2) Si hay resultados -> responder con BD */
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

    /* 3) Si no hay BD -> Gemini (con continuación) */
    const ai = await askGeminiWithContinuation(q);
    context.res = {
      status: 200,
      body: {
        mode: "ai",
        query: q,
        casoSugeridoId: null,
        answer: `Respuesta generada con inteligencia artificial:\n\n${ai}`,
        sqlError,
        debug: {
          len: ai.length,
          ended: /\[\[END\]\]\s*$/.test(ai),
          ms: Date.now() - t0
        }
      }
    };
  } catch (e) {
    context.log(e);
    context.res = { status: 500, body: { error: "Error procesando la solicitud" } };
  }
};
