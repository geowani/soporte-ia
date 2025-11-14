const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) ||
  (typeof window !== "undefined" ? window.location.origin : "");

/** Construye URL con query params seguros */
function buildUrl(path, params = {}) {
  const url = new URL(path.startsWith("/api/") ? path : `/api/${path}`, API_BASE);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length > 0) {
      url.searchParams.set(k, String(v));
    }
  });
  return url.toString();
}

/** Wrapper fetch con manejo de JSON y errores */
async function http(path, { method = "GET", headers, body, params, signal } = {}) {
  const url = buildUrl(path, params);
  const opts = {
    method,
    headers: {
      "Accept": "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  };

  const res = await fetch(url, opts);
  const ct = res.headers.get("Content-Type") || "";
  const isJson = ct.includes("application/json");
  const data = isJson ? await res.json().catch(() => ({})) : await res.text();

  if (!res.ok) {
    const msg = isJson && data && (data.error || data.message) ? (data.error || data.message) : res.statusText;
    const err = new Error(msg || `HTTP ${res.status}`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

/* ============================
 *            PING
 * ============================ */
export const ping   = () => http("ping");
export const pingDb = () => http("ping-db");

/* ============================
 *            LOGIN 
 * ============================ */
export function login({ email, password }) {
  return http("login", {
    method: "POST",
    body: { email, password },
  });
}

/* ============================
 *            CASOS
 * ============================ */
/**
 * Busca casos usando el SP dbo.sp_caso_buscar */
export function buscarCasos({ q = "", page = 1, pageSize = 20 } = {}) {
  return http("casos/search", {
    params: { q, page, pageSize },
  });
}

/* ============================
 *         SUGERENCIAS
 * ============================ */
/**
 * Lista sugerencias (paginado o top)*/
export function listarSugerencias({
  estado = "",        
  page,
  pageSize,
  term = "",          
  agenteId,             
  top,               
} = {}) {
  const params = {
    estado,
    term,
    agenteId,
    page,
    pageSize,
    top,
  };
  return http("sugerencias", { params });
}

/**
 * Crea una sugerencia (idempotente por numero_caso + agente)
 */
export function crearSugerencia({
  numero_caso,
  notas = "",
  estado = "pending",
  agenteId,           
} = {}) {
  return http("sugerencias", {
    method: "POST",
    body: { numero_caso, notas, estado, agenteId },
  });
}

export function cambiarEstadoSugerencia(id, { estado, notas = "" }) {
  if (!id) throw new Error("Falta id de sugerencia");
  return http(`sugerencias/${id}/estado`, {
    method: "PATCH",
    body: { estado, notas },
  });
}

/* ============================
 *   Helpers de uso en UI
 * ============================ */
export async function buscarCasosUI(queryText, { page = 1, pageSize = 20 } = {}) {
  try {
    const res = await buscarCasos({ q: queryText, page, pageSize });
    return res;
  } catch (e) {
    console.error("buscarCasosUI error:", e);
    return { items: [], total: 0, page, pageSize, q: queryText };
  }
}

export async function crearSugerenciaUI({ numero_caso, notas, agenteId }) {
  const out = await crearSugerencia({ numero_caso, notas, agenteId });
  return out;
}
