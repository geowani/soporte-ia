// api/ai-answer/index.js (versión protegida para uso en Genpact)
const sql = require("mssql");

/* ------------------ SQL: parsear cadena ADO.NET ------------------ */
function parseConnStr(connStr = "") {
  const parts = {};
  connStr.split(";").forEach((p) => {
    const [k, v] = p.split("=");
    if (!k || !v) return;
    parts[k.trim().toLowerCase()] = v.trim();
  });
  return {
    server: (parts["server"] || "").replace("tcp:", "").split(",")[0],
    port: parts["server"]?.includes(",")
      ? parseInt(parts["server"].split(",")[1])
      : 1433,
    database: parts["database"],
    user: parts["user id"],
    password: parts["password"],
    options: {
      encrypt: (parts["encrypt"] || "true").toLowerCase() === "true",
      trustServerCertificate:
        (parts["trustservercertificate"] || "false").toLowerCase() === "true",
    },
  };
}

const sqlConfig = parseConnStr(process.env.SQL_CONN_STR || "");

/* ------------------ IA: Configuración ------------------ */
const MODELS_PREFERRED = [
  "models/gemini-2.5-flash-latest",
  "models/gemini-2.5-pro-latest",
  "models/gemini-1.5-flash",
  "models/gemini-1.5-pro",
];

const TEMP = 0.2;
const MAX_OUTPUT_TOKENS_FIRST = 1200;
const MAX_OUTPUT_TOKENS_CONT = 800;
const MAX_CONTINUATIONS = 2;

/* ------------------ Prompt ajustado al contexto Genpact ------------------ */
function buildPrompt(q) {
  return `Eres un asistente especializado en soporte técnico de Genpact.
Tu única función es brindar orientación sobre incidencias, software, hardware, bases de datos, redes o flujos de atención al cliente dentro del entorno empresarial.
No reveles información sobre ti mismo, tu origen, tus creadores ni el modelo de IA que utilizas.
Si la pregunta no está relacionada con soporte técnico, responde de forma neutra:
"Lo siento, solo puedo responder consultas relacionadas con soporte técnico o incidencias del sistema."

Cuando sí sea una consulta válida, responde con EXACTAMENTE 3 ALTERNATIVAS numeradas del 1 al 3:
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

Cierra siempre con [[END]].`;
}

function buildContinuationPrompt(soFar) {
  return `Continúa la respuesta anterior sin repetir texto, manteniendo formato y tono técnico.
Finaliza con [[END]].
Texto previo:
${soFar}`;
}

/* ------------------ Funciones auxiliares ------------------ */
function isComplete(txt = "") {
  return /\n?\s*3\)\s/.test(txt) && /\[\[END\]\]\s*$/.test(txt);
}
function stripEnd(txt = "") {
  return txt.replace(/\s*\[\[END\]\]\s*$/, "").trim();
}
function extractText(data) {
  try {
    const parts = data?.candidates?.[0]?.content?.parts || [];
    return parts.map((p) => p?.text || "").join("\n");
  } catch {
    return "";
  }
}

/* ------------------ Verificación de tema ------------------ */
function isSupportRelated(q) {
  const techWords = [
    "soporte",
    "ticket",
    "incidencia",
    "fallo",
    "error",
    "reporte",
    "hardware",
    "software",
    "base de datos",
    "servidor",
    "sql",
    "fastapi",
    "azure",
    "login",
    "react",
    "red",
    "vpn",
    "instalación",
    "configuración",
    "driver",
    "equipo",
    "sistema",
  ];
  const forbidden = [
    "quién eres",
    "qué eres",
    "quién te creó",
    "qué es gemini",
    "modelo",
    "openai",
    "google",
    "ia eres",
    "eres real",
  ];
  const lower = q.toLowerCase();
  if (forbidden.some((f) => lower.includes(f))) return false;
  return techWords.some((w) => lower.includes(w));
}

/* ------------------ Comunicación con Gemini API ------------------ */
async function callGemini({ apiKey, modelName, prompt, maxTokens }) {
  const url = `https://generativelanguage.googleapis.com/v1/${modelName}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: TEMP, maxOutputTokens: maxTokens },
  };
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  return (extractText(data) || "").trim();
}

async function listModels(key) {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(
        key
      )}`
    );
    const data = await res.json();
    return (data.models || []).map((m) => m.name);
  } catch {
    return [];
  }
}

function orderCandidates(available) {
  const seen = new Set();
  return [...MODELS_PREFERRED, ...available].filter((n) => {
    if (!n || seen.has(n)) return false;
    seen.add(n);
    return true;
  });
}

/* ------------------ Lógica de llamada ------------------ */
async function askGeminiWithContinuation(q) {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) return "[Error] Falta GEMINI_API_KEY";

  const available = await listModels(key);
  const prompt = buildPrompt(q);
  const candidates = orderCandidates(available);

  let out = "";
  for (const modelName of candidates) {
    try {
      out = await callGemini({
        apiKey: key,
        modelName,
        prompt,
        maxTokens: MAX_OUTPUT_TOKENS_FIRST,
      });
      if (out) break;
    } catch {}
  }

  for (let i = 0; i < MAX_CONTINUATIONS && !isComplete(out); i++) {
    const cont = buildContinuationPrompt(out);
    for (const modelName of candidates) {
      try {
        const more = await callGemini({
          apiKey: key,
          modelName,
          prompt: cont,
          maxTokens: MAX_OUTPUT_TOKENS_CONT,
        });
        if (more) {
          out += "\n" + more;
          break;
        }
      } catch {}
    }
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

    // 🔹 Filtro temático: solo responder sobre soporte técnico
    if (!isSupportRelated(q)) {
      context.res = {
        status: 200,
        body: {
          mode: "filtered",
          query: q,
          answer:
            "Lo siento, solo puedo responder consultas relacionadas con soporte técnico o incidencias del sistema.",
        },
      };
      return;
    }

    // 🔹 IA directa (modo pruebas)
    if (forceAi === true) {
      const ai = await askGeminiWithContinuation(q);
      context.res = {
        status: 200,
        body: {
          mode: "ai",
          query: q,
          answer: `Respuesta generada automáticamente:\n\n${ai}`,
          debug: { ms: Date.now() - t0 },
        },
      };
      return;
    }

    // 1) Buscar en BD
    let resultados = [];
    try {
      const pool = await sql.connect(sqlConfig);
      const r = await pool
        .request()
        .input("q", sql.NVarChar, q)
        .input("page", sql.Int, 1)
        .input("pageSize", sql.Int, 3)
        .execute("dbo.sp_caso_buscar_front");
      resultados = r.recordset || [];
    } catch (err) {
      context.log("SQL ERROR:", err.message);
    }

    // 2) Si hay resultados -> devolverlos
    if (resultados.length > 0) {
      const top = resultados[0];
      const bullets = resultados
        .map(
          (c, i) =>
            `- #${i + 1} ${c.codigo}: ${c.titulo} (${c.sistema || ""}/${c.sistema_det || ""})`
        )
        .join("\n");

      context.res = {
        status: 200,
        body: {
          mode: "db",
          query: q,
          casoSugeridoId: top.id,
          answer: `Encontré casos relacionados en la base de datos:\n\n${bullets}\n\nSugerencia principal: **${top.codigo} – ${top.titulo}**\nResumen: ${top.descripcion}`,
        },
      };
      return;
    }

    // 3) Si no hay resultados -> IA con continuidad
    const ai = await askGeminiWithContinuation(q);
    context.res = {
      status: 200,
      body: {
        mode: "ai",
        query: q,
        casoSugeridoId: null,
        answer: `Respuesta generada automáticamente:\n\n${ai}`,
        debug: { ms: Date.now() - t0 },
      },
    };
  } catch (e) {
    context.log(e);
    context.res = {
      status: 500,
      body: { error: "Error procesando la solicitud" },
    };
  }
};
