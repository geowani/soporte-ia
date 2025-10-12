// app/src/pages/Resultados.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { buscarCasos } from "../api";

export default function Resultados() {
  const location = useLocation();
  const navigate = useNavigate();

  const urlQ = new URLSearchParams(location.search).get("q") || "";
  const [q, setQ] = useState(urlQ);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ===== IA bajo demanda =====
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiResult, setAiResult] = useState(null);

  const lastRegisteredRef = useRef(null);

  // === Helpers ===
  function getUserId() {
    const raw = localStorage.getItem("userId");
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  async function registrarBusqueda(term, { casoId = null, score = null } = {}) {
    const userId = getUserId();
    const texto = String(term ?? "").trim();
    if (!texto) return;

    try {
      const headers = { "Content-Type": "application/json" };
      if (userId != null) headers["x-user-id"] = String(userId);
      const body = { q: texto };
      if (userId != null) body.usuarioId = userId;
      if (casoId != null) body.casoId = casoId;
      if (score != null) body.score = score;

      await fetch("/api/busqueda-evento-registrar", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    } catch {
      // silencioso
    }
  }

  useEffect(() => setQ(urlQ), [urlQ]);

  // === Limpieza de Markdown ===
  function cleanMarkdown(s) {
    if (!s) return "";
    let t = String(s)
      .replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, ""))
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/_(.*?)_/g, "$1")
      .replace(/^#{1,6}\s*/gm, "");
    const lines = t.split(/\r?\n/);
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      let L = lines[i].trimEnd();
      const isNumbered = /^\s*\d+[\.\)]\s+/.test(L);
      const isBullet = /^\s*[-*•]\s+/.test(L);
      if (isBullet) L = L.replace(/^\s*[-*•]\s+/, "- ");
      if ((isNumbered || isBullet) && out.length && out[out.length - 1] !== "") out.push("");
      out.push(L);
    }
    return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  // === Eliminar texto innecesario de la IA ===
  function stripDbSummaryBlocks(txt) {
    if (!txt) return "";
    let t = String(txt);
    t = t.replace(/Encontr[ée]\s+casos\s+relacionados[\s\S]*?(?:Resumen:[^\n]*\n?)?/i, "");
    t = t.replace(/Sugerencia\s+principal:[^\n]*\n?/i, "");
    t = t.replace(/^\s*-\s*#\d+.*$/gmi, "");
    return t.replace(/\n{3,}/g, "\n\n").trim();
  }

  // === Eliminar emojis ===
  function removeEmojis(text) {
    if (!text) return "";
    // Rango amplio de pictogramas + variantes (FE0F) y banderas
    return text.replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|[\u1F300-\u1F6FF]|[\u1F900-\u1F9FF]|[\u1F1E6-\u1F1FF]|[\u2600-\u26FF]|\uFE0F)/g,
      ""
    );
  }

  // === Buscar en BD ===
  const runSearch = useCallback(async (term) => {
    const texto = String(term ?? "").trim();
    if (!texto) {
      setItems([]);
      setTotal(0);
      setError("");
      setAiResult(null);
      setAiError("");
      return;
    }

    setLoading(true);
    setError("");
    setItems([]);
    setTotal(0);
    setAiResult(null);
    setAiError("");

    try {
      if (lastRegisteredRef.current !== texto) {
        await registrarBusqueda(texto);
        lastRegisteredRef.current = texto;
      }

      const r = await buscarCasos({ q: texto, page: 1, pageSize: 20 });
      const arr = r.items || [];
      setItems(arr);
      setTotal(r.total ?? arr.length);
    } catch (e) {
      setError(e?.message || "Error al buscar casos");
    } finally {
      setLoading(false);
    }
  }, []);

  // === Generar con IA ===
  const generateAi = useCallback(async () => {
    const texto = q.trim();
    if (!texto) return;

    setAiLoading(true);
    setAiError("");
    setAiResult(null);

    try {
      const res = await fetch("/api/ai-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: texto, userId: getUserId() ?? 0 }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error generando respuesta");

      let answer = cleanMarkdown(data?.answer || "");
      answer = stripDbSummaryBlocks(answer);
      answer = removeEmojis(answer); // <-- sin emojis
      setAiResult({ answer });
    } catch (e) {
      setAiError(e?.message || "Error generando respuesta");
    } finally {
      setAiLoading(false);
    }
  }, [q]);

  useEffect(() => {
    runSearch(urlQ);
  }, [urlQ, runSearch]);

  const doSearch = useCallback(async () => {
    const term = q.trim();
    if (!term) return;
    if (lastRegisteredRef.current !== term) {
      await registrarBusqueda(term);
      lastRegisteredRef.current = term;
    }
    navigate(`/resultados?q=${encodeURIComponent(term)}`, { replace: true });
  }, [q, navigate]);

  const showAsideIA = useMemo(() => {
    return q.trim() && !loading && !error && (items?.length || 0) === 0 && !aiResult;
  }, [q, loading, error, items, aiResult]);

  const emptyMessage = useMemo(() => {
    if (!q.trim()) return "Escribe un término para buscar.";
    if (loading || error) return "";
    if ((items?.length || 0) === 0 && !aiResult) return `Sin coincidencias para “${q}”.`;
    return "";
  }, [q, loading, error, items, aiResult]);

  return (
    <main className="min-h-screen w-full relative overflow-hidden text-white">
      {/* Fondo */}
      <div
        className="absolute inset-0 -z-20"
        style={{
          backgroundImage: "url('/fondo.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 md:px-10 pt-6">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-wide drop-shadow">
          BASE DE CASOS
        </h1>
        <button
          onClick={() => navigate("/dashboard")}
          className="absolute right-6 top-6 px-5 py-2 rounded-full bg-red-500/90 hover:bg-red-600 font-semibold shadow-md transition"
        >
          REGRESAR
        </button>
      </div>

      {/* Contenido */}
      <div
        className={[
          "mt-6 px-4 w-full flex flex-col items-center transition-[padding] duration-200",
          showAsideIA ? "lg:pr-[200px]" : "",
        ].join(" ")}
      >
        {/* Buscador */}
        <div className="w-full max-w-3xl flex items-center rounded-full bg-white/85 text-slate-900 overflow-hidden shadow-inner">
          <input
            className="flex-1 bg-transparent px-4 py-3 outline-none placeholder:text-slate-600"
            type="text"
            placeholder="Busca por título, id o síntoma"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
          />
          <button
            onClick={doSearch}
            className="m-1 h-10 w-10 rounded-full grid place-items-center bg-slate-300/80 hover:scale-105 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 fill-slate-700">
              <path d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 0 0 1.57-4.23C16 6.01 12.99 3 9.5 3S3 6.01 3 9.5 6.01 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99 1.49-1.49-4.99-5zM9.5 14C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </button>
        </div>

        {/* CARD RESULTADOS */}
        <div className="mt-5 w-full max-w-4xl rounded-2xl bg-slate-200/85 text-slate-900 p-5 md:p-6 border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,.35)]">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-lg">Resultados:</div>
            {total > 0 && (
              <div className="text-sm text-slate-700">
                {total} coincidencia{total === 1 ? "" : "s"}
              </div>
            )}
          </div>

          {!!error && (
            <div className="text-red-700 bg-red-100 border border-red-300 rounded-md px-3 py-2 mb-3">
              {error}
            </div>
          )}

          {/* Si hay resultados de BD */}
          {!loading && !error && items?.length > 0 && (
            <div className="max-h-[60vh] overflow-y-auto pr-2">
              {items.map((c, i) => (
                <div key={i} className="py-3 border-b border-slate-400/40">
                  <div className="flex items-start justify-between">
                    <button
                      onClick={() => navigate(`/caso/${c.id_caso ?? c.id}`, { state: { fromQ: q, row: c } })}
                      className="text-blue-600 font-bold hover:underline text-left"
                    >
                      Caso: {c.numero_caso ?? c.id_caso}
                    </button>
                    <span className="text-blue-600 font-semibold">{c.departamento || "—"}</span>
                  </div>
                  <div className="text-slate-800 mt-1">
                    {c.asunto && <span className="font-semibold">{c.asunto}. </span>}
                    <span className="text-blue-600">Descripción: {c.descripcion}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Si NO hay resultados */}
          {!loading && !error && (items?.length || 0) === 0 && q.trim() && (
            <div className="mt-2">
              {aiLoading && (
                <div className="text-slate-700 animate-pulse">Generando respuesta con IA…</div>
              )}

              {!aiLoading && !aiResult && (
                <div className="text-slate-700">{emptyMessage}</div>
              )}

              {aiResult && (
                <div className="mt-3 bg-white/80 border border-slate-300 rounded-md p-4 whitespace-pre-wrap leading-relaxed text-slate-800">
                  <div className="font-semibold mb-2 text-slate-900">
                    Respuesta generada con inteligencia artificial:
                  </div>
                  {removeEmojis(aiResult.answer) || (
                    <span className="text-slate-600 italic">
                      No se generó texto. Intenta de nuevo.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PANEL LATERAL IA */}
      {showAsideIA && (
        <aside className="hidden lg:block fixed right-6 top-[180px] w-[320px] rounded-2xl p-4 border shadow-[0_12px_40px_rgba(0,0,0,.25)] bg-white/80 text-slate-900 border-white/30 ring-2 ring-sky-400">
          <div className="font-semibold text-base mb-1">¿No encontraste lo que buscabas?</div>
          <p className="text-sm mb-3">
            Generar una respuesta con IA para: <b>“{q}”</b>
          </p>
          <button
            className="w-full px-3 py-2 rounded bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-60"
            onClick={generateAi}
            disabled={aiLoading}
          >
            {aiLoading ? "Generando…" : "Generar con IA"}
          </button>
          {!!aiError && (
            <div className="mt-3 text-red-700 bg-red-100 border border-red-300 rounded-md px-3 py-2">
              {aiError}
            </div>
          )}
          <ul className="mt-3 text-xs text-slate-700 space-y-1">
            <li>• Usa palabras clave del módulo o área (p. ej., “LOM”, “CONTRATO”).</li>
            <li>• Prueba con el ID o número de caso si lo conoces.</li>
            <li>• La IA sugiere pasos; valida con procedimientos internos.</li>
          </ul>
        </aside>
      )}
    </main>
  );
}
