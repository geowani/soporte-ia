// app/src/pages/Resultados.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { buscarCasos } from "../api";

export default function Resultados() {
  const location = useLocation();
  const navigate = useNavigate();

  const urlQ = new URLSearchParams(location.search).get("q") || "";

  // Prefetch/hidratación inicial
  const initialPrefetched =
    location.state &&
    location.state.prefetched &&
    location.state.prefetched.q === urlQ
      ? location.state.prefetched
      : null;

  const [q, setQ] = useState(urlQ);

  const [items, setItems] = useState(initialPrefetched?.items || []);
  const [total, setTotal] = useState(initialPrefetched?.total || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // IA bajo demanda
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiResult, setAiResult] = useState(null);

  // Meta sugerencias
  const [aiMeta, setAiMeta] = useState(initialPrefetched?.aiMeta || null);

  const lastRegisteredRef = useRef(null);
  const hydratedForRef = useRef(initialPrefetched ? urlQ : null);

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
    } catch {}
  }

  useEffect(() => setQ(urlQ), [urlQ]);

  // Utilidades de limpieza
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
      if ((isNumbered || isBullet) && out.length && out[out.length - 1] !== "") {
        out.push("");
      }
      out.push(L);
    }
    return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  function stripDbSummaryBlocks(txt) {
    if (!txt) return "";
    let t = String(txt);
    t = t.replace(
      /Encontr[ée]\s+casos\s+relacionados[\s\S]*?(?:Resumen:[^\n]*\n?)?/i,
      ""
    );
    t = t.replace(/Sugerencia\s+principal:[^\n]*\n?/i, "");
    t = t.replace(/^\s*-\s*#\d+.*$/gim, "");
    return t.replace(/\n{3,}/g, "\n\n").trim();
  }

  function stripAiSelfHeader(txt) {
    if (!txt) return "";
    const lines = String(txt).split(/\r?\n/);
    if (
      lines.length &&
      /^\s*respuesta\s+generada\s+con\s+inteligencia\s+artificial:?\s*$/i.test(lines[0])
    ) {
      lines.shift();
      while (lines.length && /^\s*$/.test(lines[0])) lines.shift();
    }
    return lines.join("\n");
  }

  function removeEmojis(text) {
    if (!text) return "";
    try {
      return text.replace(/\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?/gu, "");
    } catch {
      return text.replace(/[💡✅⚠️🔧🔍✨🔁📌📎🧹🚫🔥⭐️]/g, "");
    }
  }

  // META IA (ligera)
  async function getAiMetaLight(term, { forzarOriginal = false } = {}) {
    const texto = String(term ?? "").trim();
    if (!texto) return null;
    try {
      const res = await fetch("/api/ai-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: texto, forzarOriginal }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        mode: data?.mode || null,
        query: data?.query || texto,
        usedQuery: data?.usedQuery || null,
        suggestion: data?.suggestion || null,
      };
    } catch {
      return null;
    }
  }

  // Para forzar original desde banner (aunque lo vamos a ocultar)
  const fetchAiMeta = useCallback(async (term, { forzarOriginal = false } = {}) => {
    const texto = String(term ?? "").trim();
    if (!texto) {
      setAiMeta(null);
      return;
    }
    try {
      const res = await fetch("/api/ai-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: texto, forzarOriginal }),
      });
      const data = await res.json();
      setAiMeta({
        mode: data?.mode || null,
        query: data?.query || texto,
        usedQuery: data?.usedQuery || null,
        suggestion: data?.suggestion || null,
      });
    } catch {
      setAiMeta(null);
    }
  }, []);

  // Normalizar meta para NO mostrar banner si ya autocorregimos
  function normalizeMetaAfterAutocorrect(meta, original, effective) {
    if (!meta) return null;
    if (effective !== original) {
      // neutraliza la condición del banner
      return { ...meta, query: effective, usedQuery: effective };
    }
    return meta;
  }

  // Buscar en BD (con autocorrección previa)
  const runSearch = useCallback(
    async (term) => {
      const original = String(term ?? "").trim();

      // Evita re-buscar si ya hidratamos exactamente este término
      if (hydratedForRef.current === original) return;

      if (!original) {
        setItems([]);
        setTotal(0);
        setError("");
        setAiResult(null);
        setAiError("");
        setAiMeta(null);
        return;
      }

      setLoading(true);
      setError("");
      setItems([]);
      setTotal(0);
      setAiResult(null);
      setAiError("");
      setAiMeta(null);

      try {
        // 1) Sugerencia primero
        const metaRaw = await getAiMetaLight(original);
        const effective =
          metaRaw?.usedQuery && metaRaw.usedQuery !== original ? metaRaw.usedQuery : original;

        // 2) Normaliza meta para no disparar el banner
        const meta = normalizeMetaAfterAutocorrect(metaRaw, original, effective);
        if (meta) setAiMeta(meta);

        // Reflejar término efectivo en URL/estado si difiere
        if (effective !== original) {
          setQ(effective);
          navigate(`/resultados?q=${encodeURIComponent(effective)}`, { replace: true });
        }

        // 3) Registrar + buscar
        if (lastRegisteredRef.current !== effective) {
          await registrarBusqueda(effective);
          lastRegisteredRef.current = effective;
        }

        const r = await buscarCasos({ q: effective, page: 1, pageSize: 20 });
        const arr = r.items || [];
        setItems(arr);
        setTotal(r.total ?? arr.length);
      } catch (e) {
        setError(e?.message || "Error al buscar casos");
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  // IA larga
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
      setAiResult({ answer });
    } catch (e) {
      setAiError(e?.message || "Error generando respuesta");
    } finally {
      setAiLoading(false);
    }
  }, [q]);

  // Hidratación desde location.state
  useEffect(() => {
    const st = location.state;
    if (st?.prefetched && st.prefetched.q === urlQ) {
      const { items: pfItems, total: pfTotal, aiMeta: pfMetaRaw, q: qEff } = st.prefetched;
      // Normaliza meta al hidratar
      const pfMeta = normalizeMetaAfterAutocorrect(pfMetaRaw, urlQ, qEff);

      setItems(pfItems || []);
      setTotal(pfTotal || 0);
      if (pfMeta) setAiMeta(pfMeta);
      setError("");
      setLoading(false);
      hydratedForRef.current = urlQ;

      navigate(location.pathname + location.search, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  // Si no venimos con prefetch, ejecuta búsqueda normal
  useEffect(() => {
    if (!initialPrefetched) {
      runSearch(urlQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQ]);

  // doSearch con Prefetch + Hydrate
  const doSearch = useCallback(async () => {
    const original = q.trim();
    if (!original) return;

    // 1) Autocorrección ligera
    const metaRaw = await getAiMetaLight(original);
    const effective =
      metaRaw?.usedQuery && metaRaw.usedQuery !== original ? metaRaw.usedQuery : original;

    // 2) Registrar con query efectiva
    if (lastRegisteredRef.current !== effective) {
      await registrarBusqueda(effective);
      lastRegisteredRef.current = effective;
    }

    // 3) Prefetch antes de navegar
    let prefetched = { items: [], total: 0 };
    try {
      const r = await buscarCasos({ q: effective, page: 1, pageSize: 20 });
      prefetched.items = r?.items || [];
      prefetched.total = r?.total ?? prefetched.items.length;
    } catch {}

    // 4) Normaliza meta para no mostrar banner
    const meta = normalizeMetaAfterAutocorrect(metaRaw, original, effective);

    // 5) Navegar ya con datos + meta normalizada
    navigate(`/resultados?q=${encodeURIComponent(effective)}`, {
      replace: true,
      state: { prefetched: { ...prefetched, q: effective, aiMeta: meta || null } },
    });
  }, [q, navigate]);

  // Panel IA condicional
  const showAsideIA = useMemo(() => {
    return q.trim() && !loading && !error && (items?.length || 0) === 0 && !aiResult;
  }, [q, loading, error, items, aiResult]);

  const emptyMessage = useMemo(() => {
    if (!q.trim()) return "Escribe un término para buscar.";
    if (loading || error) return "";
    if ((items?.length || 0) === 0 && !aiResult) return `Sin coincidencias para “${q}”.`;
    return "";
  }, [q, loading, error, items, aiResult]);

  const gridColsClass = showAsideIA
    ? "lg:grid-cols-[1fr_minmax(340px,380px)] lg:gap-4"
    : "lg:grid-cols-1 lg:gap-0";

  const maxWidthClass = showAsideIA ? "max-w-6xl" : "max-w-4xl";

  // Handlers (el banner no saldrá, pero los dejamos por compatibilidad)
  const handleUseSuggested = useCallback(() => {
    if (!aiMeta?.usedQuery) return;
    setQ(aiMeta.usedQuery);
    navigate(`/resultados?q=${encodeURIComponent(aiMeta.usedQuery)}`, { replace: true });
  }, [aiMeta, navigate]);

  const handleForceOriginal = useCallback(async () => {
    if (!aiMeta?.query) return;
    await fetchAiMeta(aiMeta.query, { forzarOriginal: true });
    setQ(aiMeta.query);
    navigate(`/resultados?q=${encodeURIComponent(aiMeta.query)}`, { replace: true });
  }, [aiMeta, fetchAiMeta, navigate]);

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
      <div className="mt-6 px-4 w-full flex flex-col items-center">
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
              <path d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 0 0 1.57-4.23C16 6.01 12.99 3 9.5 3S3 6.01 3 9.5 6.01 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99 1.49-1.49-4.99-5zM9.5 14C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
          </button>
        </div>

        {/* GRID RESULTADOS + (opcional) PANEL IA escritorio */}
        <div className={`mt-5 w-full ${maxWidthClass} grid ${gridColsClass} items-start`}>
          {/* CARD RESULTADOS */}
          <div className="min-w-0 w-full rounded-2xl bg-slate-200/85 text-slate-900 p-5 md:p-6 border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,.35)]">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-lg">Resultados:</div>
              {total > 0 && (
                <div className="text-sm text-slate-700">
                  {total} coincidencia{total === 1 ? "" : "s"}
                </div>
              )}
            </div>

            {/* Banner neutralizado: la condición nunca se cumple por la normalización */}
            {aiMeta?.usedQuery && aiMeta.usedQuery !== aiMeta.query && (
              <div className="hidden" />
            )}

            {!!error && (
              <div className="text-red-700 bg-red-100 border border-red-300 rounded-md px-3 py-2 mb-3">
                {error}
              </div>
            )}

            {/* Resultados de BD */}
            {!loading && !error && items?.length > 0 && (
              <div className="max-h-[60vh] overflow-y-auto pr-2">
                {items.map((c, i) => (
                  <div key={i} className="py-3 border-b border-slate-400/40">
                    <div className="flex items-start justify-between">
                      <button
                        onClick={() =>
                          navigate(`/caso/${c.id_caso ?? c.id}`, {
                            state: { fromQ: q, row: c },
                          })
                        }
                        className="text-blue-600 font-bold hover:underline text-left"
                      >
                        Caso: {c.numero_caso ?? c.id_caso}
                      </button>
                      <span className="text-blue-600 font-semibold">
                        {c.departamento || "—"}
                      </span>
                    </div>
                    <div className="text-slate-800 mt-1">
                      {c.asunto && <span className="font-semibold">{c.asunto}. </span>}
                      <span className="text-blue-600">Descripción: {c.descripcion}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sin resultados */}
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
                    {removeEmojis(
                      stripAiSelfHeader(cleanMarkdown(stripDbSummaryBlocks(aiResult.answer)))
                    ) || (
                      <span className="text-slate-600 italic">
                        No se generó texto. Intenta de nuevo.
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PANEL IA — DESKTOP */}
          {showAsideIA && (
            <aside className="hidden lg:block lg:w-[360px] lg:max-w-[380px] rounded-2xl bg-white/80 backdrop-blur-sm p-5 shadow border border-slate-200 text-slate-900">
              <h3 className="text-lg font-bold mb-2">¿No encontraste lo que buscabas?</h3>
              <p className="text-sm text-slate-600 mb-4">
                Generar una respuesta con IA para:
                <br />
                <b>“{q}”</b>
              </p>

              <button
                onClick={generateAi}
                disabled={aiLoading}
                className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-60 bg-slate-800 hover:bg-slate-900"
              >
                {aiLoading ? "Generando…" : "Generar con IA"}
              </button>

              {!!aiError && (
                <div className="mt-3 text-red-700 bg-red-100 border border-red-300 rounded-md px-3 py-2">
                  {aiError}
                </div>
              )}

              <ul className="mt-4 text-xs text-slate-600 list-disc pl-5 space-y-1 leading-relaxed">
                <li>Usa palabras clave del módulo o área.</li>
                <li>Prueba con ID o número de caso si lo conoces.</li>
                <li>Valida los pasos con procedimientos internos.</li>
              </ul>
            </aside>
          )}
        </div>

        {/* PANEL IA — MÓVIL */}
        {showAsideIA && (
          <section className="lg:hidden w-full max-w-6xl px-0 mt-4">
            <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-5 shadow border border-slate-200 text-slate-900">
              <h3 className="text-lg font-bold mb-2">¿No encontraste lo que buscabas?</h3>
              <p className="text-sm text-slate-600 mb-4">
                Generar una respuesta con IA para:
                <br />
                <b>“{q}”</b>
              </p>

              <button
                onClick={generateAi}
                disabled={aiLoading}
                className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-60 bg-slate-800 hover:bg-slate-900"
              >
                {aiLoading ? "Generando…" : "Generar con IA"}
              </button>

              {!!aiError && (
                <div className="mt-3 text-red-700 bg-red-100 border border-red-300 rounded-md px-3 py-2">
                  {aiError}
                </div>
              )}

              <ul className="mt-4 text-xs text-slate-600 list-disc pl-5 space-y-1 leading-relaxed">
                <li>Usa palabras clave del módulo o área.</li>
                <li>Prueba con ID o número de caso si lo conoces.</li>
                <li>Valida los pasos con procedimientos internos.</li>
              </ul>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
