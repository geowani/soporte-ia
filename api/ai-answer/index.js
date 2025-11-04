// /api/ai-answer/index.js  (versión flexible con SQL + Gemini + modo estricto opcional)
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
Eres un asistente especializado en soporte técnico empresarial.
Objetivo: dar orientación clara, accionable y breve (listas de pasos) sobre incidencias, software, hardware, redes, accesos, contraseñas, VPN, correo, SAP, SQL/DBA, Azure, Windows/macOS, impresoras, permisos, etc.

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
No inventes datos. No incluyas disclaimers innecesarios. Español neutro.
`.trim();

const BASE_PROMPT_FLEX = `
Eres un asistente técnico útil. Si la consulta es de TI, responde como soporte (pasos concretos).
Si NO es de TI, igualmente brinda una guía breve, responsable y práctica (en 4-6 líneas) y sugiere el canal correcto si aplica.
Evita rechazar en seco. Español neutro. Usa el mismo formato de "3 alternativas" cuando tenga sentido.
Cierra con [[END]].
`.trim();

function buildPrompt(q, looksLikeIT, strict) {
  // En modo estricto y no TI -> prompt breve y canal sin rechazar
  if (strict && !looksLikeIT) {
    return `
Eres un asistente de soporte TI. El usuario hizo una consulta no TI. 
Responde en 5-7 líneas con orientación general breve y sugiere el área/canal correcto. 
No digas "lo siento". Cierra con [[END]].
Consulta: ${q}
`.trim();
  }
  // Si es TI -> prompt TI
  if (looksLikeIT) {
    return `${BASE_PROMPT_TI}\n\nConsulta:\n${q}\n`;
  }
  // Flexible por defecto
  return `${BASE_PROMPT_FLEX}\n\nConsulta:\n${q}\n`;
}

function buildContinuationPrompt(soFar) {
  return `Continúa la respuesta anterior sin repetir texto. Mantén tono y formato. Finaliza con [[END]].\nTexto previo:\n${soFar}`;
}

/* ------------------ Utilidades ------------------ */
function normalize(s = "") {
  return s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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
  // Palabras/expresiones típicas TI
  const include = [
    "soporte","ticket","incidencia","fallo","error","reporte","hardware","software",
    "base de datos","database","servidor","server","sql","azure","login","iniciar sesion",
    "credencial","acceso","bloqueo","permiso","react","fastapi","dotnet","c#","node",
    "red","vpn","instalacion","configuracion","driver","equipo","sistema","correo",
    "outlook","office","impresora","printer","licencia","sap","teams","zoom","windows",
    "mac","firewall","router","switch","dba","backup","restauracion","contrasena","contraseña"
  ];
  // Bloqueos explícitos (evitar falsos positivos con “modelo” genérico)
  const identity = /\b(quien eres|que eres|quien te creo|que modelo eres|eres real)\b/;
  if (identity.test(q)) return false;

  return include.some(w => q.includes(w));
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
  if (!key) {
    // Sin clave -> modo demo
    return `[[END]]`; // evitamos ruido; el frontend lo manejará
  }

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
function cors() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

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
    if (!q) {
      context.res = { status: 400, headers: cors(), body: { error: "Falta q" } };
      return;
    }

    const STRICT = String(process.env.STRICT_SUPPORT || "").toLowerCase() === "true";
    const looksLikeIT = isSupportRelated(q);
    const forceOpen = forceMode === "open";

    // 1) Buscar en BD (solo si no forzamos modo abierto)
    if (!forceOpen) {
      try {
        const pool = await sql.connect(sqlConfig);
        const r = await pool
          .request()
          .input("q", sql.NVarChar, q)
          .input("page", sql.Int, 1)
          .input("pageSize", sql.Int, 3)
          .execute("dbo.sp_caso_buscar_front");

        const resultados = r.recordset || [];
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
              mode: "db",
              query: q,
              casoSugeridoId: top.id,
              answer: `Encontré casos relacionados en la base de datos:\n\n${bullets}\n\nSugerencia principal: **${top.codigo} – ${top.titulo}**\nResumen: ${top.descripcion}\n[[END]]`,
            },
          };
          return;
        }
      } catch (err) {
        context.log("SQL ERROR:", err?.message);
        // Continuamos hacia IA aunque la BD falle
      }
    }

    // 2) IA (flexible por defecto; estricto solo si STRICT_SUPPORT=true)
    const ai = await askGeminiWithContinuation(q, looksLikeIT, STRICT && !forceOpen);

    // Blindaje: si quedó vacío (p.ej., sin clave), da una guía mínima
    const answer =
      (ai && ai.trim()) ||
      (looksLikeIT
        ? `1) Verifica datos de la incidencia\n- Reúne síntomas y mensajes de error\n- Identifica módulo/área afectada\n- Intenta reproducir el problema\n\n2) Accesos y dependencias\n- Valida credenciales/permisos\n- Revisa conectividad/VPN\n- Confirma versiones/instalación\n\n3) Escalamiento\n- Registra el ticket con evidencias\n- Asigna prioridad y responsable\n- Documenta solución y lecciones\n[[END]]`
        : `1) Aclara el objetivo\n- Resume el contexto\n- Define el resultado esperado\n- Lista restricciones\n\n2) Primeros pasos prácticos\n- Identifica fuentes confiables\n- Compara 2–3 alternativas\n- Establece un checklist\n\n3) Siguiente acción\n- Documenta lo decidido\n- Establece un responsable\n- Define fecha de revisión\n[[END]]`);

    context.res = {
      status: 200,
      headers: cors(),
      body: {
        mode: looksLikeIT ? "ai-it" : (STRICT && !forceOpen ? "ai-brief" : "ai-open"),
        query: q,
        answer,
        debug: { ms: Date.now() - t0, looksLikeIT, STRICT, forceOpen },
      },
    };
  } catch (e) {
    context.log(e);
    context.res = { status: 500, headers: cors(), body: { error: "Error procesando la solicitud" } };
  }
};
