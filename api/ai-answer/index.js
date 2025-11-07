// /api/ai-answer/index.js
// SQL + sugerencia "¿quisiste decir…?" + Gemini + filtro SOLO SOPORTE (hard-stop) + guardrails en IA

const sql = require("mssql");
const didYouMean = require("didyoumean2").default;

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
    port: parts["server"]?.includes(",") ? parseInt(parts["server"].split(",")[1]) : 1433,
    database: parts["database"] || parts["initial catalog"],
    user: parts["user id"] || parts["user"],
    password: parts["password"],
    options: {
      encrypt: (parts["encrypt"] || "true").toLowerCase() === "true",
      trustServerCertificate: (parts["trustservercertificate"] || "false").toLowerCase() === "true",
    },
  };
}
const sqlConfig = parseConnStr(process.env.SQL_CONN_STR || process.env.DB_CONN || "");

/* ------------------ IA: Configuración ------------------ */
const MODELS_PREFERRED = [
  "models/gemini-2.5-flash-latest",
  "models/gemini-2.5-pro-latest",
  "models/gemini-1.5-flash",
  "models/gemini-1.5-pro",
];

const TEMP = 0.25;
const MAX_OUTPUT_TOKENS_FIRST = 1100;
const MAX_OUTPUT_TOKENS_CONT = 700;
const MAX_CONTINUATIONS = 2;

/* ------------------ Prompts ------------------ */
const BASE_PROMPT_TI = `
Eres un asistente especializado EXCLUSIVAMENTE en soporte técnico empresarial (TI).
NO debes responder NADA que no sea sobre incidencias de TI (hardware, software, redes, accesos, contraseñas, VPN, correo, SAP, SQL/DBA, Azure, Windows/macOS, impresoras, permisos, etc.).
Si detectas que la consulta no es TI, responde exactamente [[FILTERED_NON_TI]] y nada más.

Formato EXACTO:
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

Cierra SIEMPRE con [[END]].
Español neutro. No inventes datos.
`.trim();

const BASE_PROMPT_FLEX = `
Eres un asistente EXCLUSIVO de TI. Si la consulta NO es de TI, responde exactamente [[FILTERED_NON_TI]].
De lo contrario, responde en 4-6 líneas con guía práctica y, si aplica, sugiere el canal interno correcto. Cierra con [[END]].
`.trim();

function buildPrompt(q, looksLikeIT, strict) {
  // Aunque ya filtramos antes, reforzamos el guardrail.
  if (strict && !looksLikeIT) {
    return `
Eres un asistente SOLO de TI. La consulta no es de TI.
Responde exactamente [[FILTERED_NON_TI]].
Consulta: ${q}
`.trim();
  }
  if (looksLikeIT) {
    return `${BASE_PROMPT_TI}\n\nConsulta:\n${q}\n`;
  }
  return `${BASE_PROMPT_FLEX}\n\nConsulta:\n${q}\n`;
}

function buildContinuationPrompt(soFar) {
  return `Continúa la respuesta anterior sin repetir texto. Mantén el mismo formato. Finaliza con [[END]].\nTexto previo:\n${soFar}`;
}

/* ------------------ Utilidades ------------------ */
function normalize(s = "") {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
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

/* ------------------ Clasificador TI robusto ------------------ */
function isSupportRelated(qRaw) {
  const q = normalize(String(qRaw || ""));
  const include = [
    "soporte","ticket","incidencia","fallo","error","reporte","hardware","software",
    "base de datos","database","servidor","server","sql","azure","login","iniciar sesion",
    "credencial","acceso","bloqueo","permiso","react","fastapi","dotnet","c#","node",
    "red","vpn","instalacion","configuracion","driver","equipo","sistema","correo",
    "outlook","office","impresora","printer","licencia","sap","teams","zoom","windows",
    "mac","firewall","router","switch","dba","backup","restauracion","contrasena","contraseña"
  ];
  const identity = /\b(quien eres|que eres|quien te creo|que modelo eres|eres real)\b/;
  if (identity.test(q)) return false;
  return include.some((w) => q.includes(w));
}

/* ------------------ Gemini API ------------------ */
async function callGemini({ apiKey, modelName, prompt, maxTokens }) {
  const url = `https://generativelanguage.googleapis.com/v1/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
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
      `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(key)}`
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

async function askGeminiWithContinuation(q, looksLikeIT, strict) {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) return `[[END]]`; // sin clave: salida controlada

  const available = await listModels(key);
  const candidates = orderCandidates(available);

  let out = "";
  const firstPrompt = buildPrompt(q, looksLikeIT, strict);

  for (const modelName of candidates) {
    try {
      out = await callGemini({
        apiKey: key,
        modelName,
        prompt: firstPrompt,
        maxTokens: MAX_OUTPUT_TOKENS_FIRST,
      });
      if (out) break;
    } catch {}
  }

  // Si la IA devuelve el marcador de filtrado, no continúes
  if (out && out.includes("[[FILTERED_NON_TI]]")) {
    return "[[FILTERED_NON_TI]]";
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
          // Si en continuación detecta no-TI, corta.
          if (more.includes("[[FILTERED_NON_TI]]")) return "[[FILTERED_NON_TI]]";
          out += "\n" + more;
          break;
        }
      } catch {}
    }
  }

  return stripEnd(out);
}

/* ------------------ Sugerencias tipo Google (didyoumean2) ------------------ */
let __DICT_WORDS = null;
let __DICT_PHRASES = null;

function tokenizeTitle(t) {
  return normalize(String(t || ""))
    .replace(/[^a-z0-9áéíóúñ\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w && w.length >= 3);
}
function unique(arr) { return Array.from(new Set(arr)); }

async function buildDictionary(pool) {
  if (__DICT_WORDS && __DICT_PHRASES) return { words: __DICT_WORDS, phrases: __DICT_PHRASES };

  let titles = [];
  try {
    const r = await pool
      .request()
      .input("q", sql.NVarChar, "")
      .input("page", sql.Int, 1)
      .input("pageSize", sql.Int, 200)
      .execute("dbo.sp_caso_buscar_front");
    titles = (r.recordset || []).map((x) => x.titulo).filter(Boolean);
  } catch {}

  if (!titles.length) {
    try {
      const r2 = await pool.query(`
        SELECT TOP (500) Titulo 
        FROM dbo.Casos WITH (NOLOCK)
        WHERE Titulo IS NOT NULL AND LEN(LTRIM(RTRIM(Titulo))) > 0
        ORDER BY Id DESC
      `);
      titles = (r2.recordset || []).map((x) => x.Titulo).filter(Boolean);
    } catch {}
  }

  if (!titles.length) {
    try {
      const r3 = await pool.query(`
        SELECT TOP (500) Titulo 
        FROM dbo.Caso WITH (NOLOCK)
        WHERE Titulo IS NOT NULL AND LEN(LTRIM(RTRIM(Titulo))) > 0
        ORDER BY Id DESC
      `);
      titles = (r3.recordset || []).map((x) => x.Titulo).filter(Boolean);
    } catch {}
  }

  if (!titles.length) {
    titles = [
      "usuario bloqueado",
      "error de credenciales",
      "no puedo iniciar sesión",
      "pdf no carga en chrome",
      "contraseña vencida",
      "no abre formulario",
      "problemas con correo",
      "cambio de contraseña",
    ];
  }

  const phrases = unique(titles.map((t) => t.toLowerCase().trim()).filter((t) => t && t.length >= 3));
  const words = unique(titles.flatMap((t) => tokenizeTitle(t)));

  __DICT_WORDS = words;
  __DICT_PHRASES = phrases;
  return { words: __DICT_WORDS, phrases: __DICT_PHRASES };
}

function suggestQuery(q, words, phrases) {
  const qNorm = normalize(q).trim();
  if (!qNorm) return null;

  const phrase = didYouMean(qNorm, phrases, { threshold: 0.6 });
  if (phrase && phrase !== qNorm) return phrase;

  const toks = qNorm.split(/\s+/).filter(Boolean);
  const fixed = toks.map((t) => didYouMean(t, words, { threshold: 0.6 }) || t);
  const candidate = fixed.join(" ");
  if (candidate !== qNorm) return candidate;

  return null;
}

/* ------------------ CORS ------------------ */
function cors() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

/* ------------------ Handler principal ------------------ */
module.exports = async function (context, req) {
  const t0 = Date.now();
  try {
    if (req.method === "OPTIONS") {
      context.res = { status: 204, headers: cors() };
      return;
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const q = String(body.q || "").trim();
    const forceMode = String(body.mode || "").toLowerCase(); // "open" para forzar amplitud
    const forceOriginal = !!body.forzarOriginal;

    if (!q) {
      context.res = { status: 400, headers: cors(), body: { error: "Falta q" } };
      return;
    }

    // 🔒 HARD-STOP: SOLO atender soporte técnico
    if (!isSupportRelated(q)) {
      context.res = {
        status: 200,
        headers: cors(),
        body: {
          mode: "filtered",
          query: q,
          // Mensaje neutral, sin "lo siento", y útil para guiar al usuario.
          answer: "Solo atiendo consultas de soporte técnico (TI). Reformula tu pregunta con detalles técnicos (ej.: error, sistema, acceso, red, base de datos) para poder ayudarte.",
        },
      };
      return;
    }

    const STRICT = String(process.env.STRICT_SUPPORT || "").toLowerCase() === "true";
    const looksLikeIT = true; // ya filtrado arriba
    const forceOpen = forceMode === "open";

    // 1) Buscar en BD (con corrección NLP si no hay resultados)
    if (!forceOpen) {
      try {
        const pool = await sql.connect(sqlConfig);

        // BÚSQUEDA 1: query original
        let r = await pool
          .request()
          .input("q", sql.NVarChar, q)
          .input("page", sql.Int, 1)
          .input("pageSize", sql.Int, 3)
          .execute("dbo.sp_caso_buscar_front");

        let resultados = r.recordset || [];
        let suggestion = null;
        let usedQuery = q;

        // BÚSQUEDA 2: sugerencia NLP (frase completa o tokens)
        if (!forceOriginal && resultados.length === 0) {
          const { words, phrases } = await buildDictionary(pool);
          suggestion = suggestQuery(q, words, phrases);

          if (suggestion && suggestion !== q.toLowerCase()) {
            usedQuery = suggestion;

            const r2 = await pool
              .request()
              .input("q", sql.NVarChar, usedQuery)
              .input("page", sql.Int, 1)
              .input("pageSize", sql.Int, 3)
              .execute("dbo.sp_caso_buscar_front");

            resultados = r2.recordset || [];
          }
        }

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
            headers: cors(),
            body: {
              mode: suggestion ? "db-suggested" : "db",
              query: q,
              usedQuery,          // "Se muestran resultados de X"
              suggestion,         // "Buscar, en cambio, q"
              casoSugeridoId: top.id,
              answer: `Encontré casos relacionados en la base de datos:\n\n${bullets}\n\nSugerencia principal: **${top.codigo} – ${top.titulo}**\nResumen: ${top.descripcion}\n[[END]]`,
            },
          };
          return;
        }

        // Sin resultados -> continuar a IA (sigue filtrado a TI)
      } catch (err) {
        context.log("SQL ERROR:", err?.message);
        // Continúa a IA aunque la BD falle
      }
    }

    // 2) IA (solo TI; si detecta no-TI, devuelve [[FILTERED_NON_TI]] y lo transformamos en mensaje neutral)
    let ai = await askGeminiWithContinuation(q, looksLikeIT, STRICT && !forceOpen);

    if (ai && ai.includes("[[FILTERED_NON_TI]]")) {
      // Defensa extra (no debería ocurrir por el hard-stop inicial)
      context.res = {
        status: 200,
        headers: cors(),
        body: {
          mode: "filtered-ia",
          query: q,
          answer:
            "Solo atiendo consultas de soporte técnico (TI). Por favor incluye el sistema afectado, mensaje de error y qué probaste hasta ahora.",
        },
      };
      return;
    }

    // Blindaje: si quedó vacío (p. ej., sin clave), da una guía mínima TI
    const answer =
      (ai && ai.trim()) ||
      `1) Verifica datos de la incidencia
- Reúne síntomas y mensajes de error
- Identifica módulo/área afectada
- Intenta reproducir el problema

2) Accesos y dependencias
- Valida credenciales/permisos
- Revisa conectividad/VPN
- Confirma versiones/instalación

3) Escalamiento
- Registra el ticket con evidencias
- Asigna prioridad y responsable
- Documenta solución y lecciones
[[END]]`;

    context.res = {
      status: 200,
      headers: cors(),
      body: {
        mode: "ai-it",
        query: q,
        answer,
        debug: { ms: Date.now() - t0, STRICT, forceOpen },
      },
    };
  } catch (e) {
    context.log(e);
    context.res = { status: 500, headers: cors(), body: { error: "Error procesando la solicitud" } };
  }
};
