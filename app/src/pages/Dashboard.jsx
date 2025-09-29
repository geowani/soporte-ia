// app/src/pages/Dashboard.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard({ onLogout, isBlocked = false }) {
  const [q, setQ] = useState("");
  const [forceAi, setForceAi] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { mode, query, answer, casoSugeridoId, ... }
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  // Lee un userId válido (>0). Si no, devuelve null.
  function getUserId() {
    const raw = localStorage.getItem("userId");
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  // Limpia userId al cerrar sesión
  const handleLogout = useCallback(() => {
    localStorage.removeItem("userId");
    onLogout?.();
  }, [onLogout]);

  // (Opcional) intenta poblar userId desde un perfil guardado
  useEffect(() => {
    if (getUserId() == null) {
      try {
        const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
        if (raw) {
          const u = JSON.parse(raw);
          const candidate = Number(u?.id_usuario ?? u?.id ?? u?.userId);
          if (Number.isFinite(candidate) && candidate > 0) {
            localStorage.setItem("userId", String(candidate));
          }
        }
      } catch {}
    }
    console.log("[Dashboard] userId activo:", getUserId());
  }, []);

  // Registra la búsqueda en backend
  async function registrarBusqueda(term, { casoId = null, score = null } = {}) {
    const userId = getUserId(); // null si no hay válido
    const texto = String(term ?? "").trim();
    if (!texto) return;

    try {
      const headers = { "Content-Type": "application/json" };
      if (userId != null) headers["x-user-id"] = String(userId);

      const body = { q: texto };
      if (casoId != null) body.casoId = casoId;
      if (score != null) body.score = score;
      if (userId != null) body.usuarioId = userId;

      const res = await fetch("/api/busqueda-evento-registrar", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => ({}));
      console.log("[registrarBusqueda] response:", res.status, json);
    } catch (e) {
      console.warn("[registrarBusqueda] error:", e);
    }
  }

  // Llama a la IA/BD y muestra resultado debajo del buscador
  const ejecutarBusqueda = useCallback(async () => {
    const term = q.trim();
    if (!term) {
      alert("Por favor ingresa un término para buscar");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const userId = getUserId() ?? 0;
      const res = await fetch("/api/ai-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: term, userId, forceAi }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Error en la API");
      }

      setResult(data);

      // registra la búsqueda (si tienes SP para logging)
      await registrarBusqueda(term, {
        casoId: data?.casoSugeridoId ?? null,
        score: data?.mode === "db" ? 1.0 : null,
      });
    } catch (e) {
      setError(e?.message || "Error realizando la búsqueda");
    } finally {
      setLoading(false);
    }
  }, [q, forceAi]);

  // ENTER para buscar / ESC para salir
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") handleLogout();
      if (e.key === "Enter") {
        e.preventDefault();
        ejecutarBusqueda();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleLogout, ejecutarBusqueda]);

  // Render helpers
  function Badge({ mode }) {
    const isDb = mode === "db";
    const color = isDb ? "bg-emerald-500" : "bg-indigo-500";
    const label = isDb ? "Base de datos" : "IA (Gemini)";
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-white text-xs font-bold ${color}`}>
        {label}
      </span>
    );
  }

  function AnswerBlock({ data }) {
    if (!data) return null;
    const { mode, answer, casoSugeridoId } = data;

    return (
      <div className="mt-6 w-full max-w-2xl mx-auto rounded-xl bg-white/90 text-slate-900 p-5 shadow-[0_12px_40px_rgba(0,0,0,.30)]">
        <div className="flex items-center justify-between gap-3">
          <Badge mode={mode} />
          {mode === "db" && !!casoSugeridoId && (
            <button
              onClick={() => navigate(`/caso/${casoSugeridoId}`)}
              className="px-3 py-1.5 rounded-md bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900"
              title="Ver detalle del caso sugerido"
            >
              Ver detalle
            </button>
          )}
        </div>

        <div className="mt-4 whitespace-pre-wrap leading-relaxed">
          {answer}
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            onClick={() => navigate(`/resultados?q=${encodeURIComponent(q)}`)}
            className="px-3 py-1.5 rounded-md bg-slate-700 text-white text-sm hover:bg-slate-800"
            title="Ver más resultados"
          >
            Ver más
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full relative overflow-hidden text-white">
      {/* Fondo */}
      <div
        className="absolute inset-0 -z-20"
        style={{
          backgroundImage: "url('/fondo.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Partículas */}
      <div
        className="absolute inset-0 -z-10 opacity-45"
        style={{
          backgroundImage: `
            radial-gradient(2px 2px at 20% 30%, rgba(88,164,255,.6) 40%, transparent 41%),
            radial-gradient(2px 2px at 40% 70%, rgba(88,164,255,.45) 40%, transparent 41%),
            radial-gradient(2px 2px at 65% 50%, rgba(88,164,255,.5) 40%, transparent 41%),
            radial-gradient(2px 2px at 80% 20%, rgba(88,164,255,.35) 40%, transparent 41%),
            radial-gradient(2px 2px at 15% 85%, rgba(88,164,255,.35) 40%, transparent 41%)
          `,
          filter: "blur(.2px)",
          animation: "float 12s linear infinite",
        }}
      />
      <style>
        {`@keyframes float { 0%{transform:translateY(0)} 50%{transform:translateY(-10px)} 100%{transform:translateY(0)} }`}
      </style>

      {/* Salir */}
      <button
        onClick={handleLogout}
        className="absolute right-6 top-6 px-5 py-2 rounded-full bg-red-500/90 hover:bg-red-600 font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
      >
        Salir
      </button>

      {/* Contenido */}
      <div className="min-h-screen grid place-items-center p-6">
        <section className="w-full max-w-4xl text-center">
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-widest drop-shadow-[0_10px_40px_rgba(0,0,0,.6)]">
            BASE DE CASOS
          </h1>

          {/* Buscador */}
          <div className="mt-8 w-full max-w-2xl mx-auto">
            <div className="flex items-center rounded-full bg-slate-200/90 overflow-hidden ring-1 ring-white/20 shadow-[0_12px_40px_rgba(0,0,0,.35)]">
              <input
                className="flex-1 bg-transparent px-5 py-3 text-slate-900 placeholder:text-slate-600 outline-none"
                type="text"
                placeholder="Busca por título, id o síntoma"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Barra de búsqueda"
              />
              <button
                onClick={ejecutarBusqueda}
                className="m-1 h-10 w-10 rounded-full grid place-items-center bg-slate-300/80 hover:scale-105 transition"
                aria-label="Buscar"
                title="Buscar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 fill-slate-700">
                  <path d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 0 0 1.57-4.23C16 6.01 12.99 3 9.5 3S3 6.01 3 9.5 6.01 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99 1.49-1.49-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
              </button>
            </div>

            {/* Controles extra */}
            <div className="flex items-center justify-center gap-4 mt-3 text-sm">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceAi}
                  onChange={(e) => setForceAi(e.target.checked)}
                />
                <span>Forzar IA (Gemini)</span>
              </label>

              <button
                onClick={() => navigate(`/resultados?q=${encodeURIComponent(q.trim())}`)}
                className="px-3 py-1.5 rounded-md bg-slate-700 text-white hover:bg-slate-800"
                title="Abrir vista de resultados"
              >
                Abrir Resultados
              </button>
            </div>
          </div>

          {/* Estado de red */}
          <div className="mt-6">
            {loading && (
              <div className="text-sm text-white/90 animate-pulse">
                Consultando {forceAi ? "IA (Gemini)" : "BD…"} por “{q.trim()}”
              </div>
            )}
            {error && (
              <div className="text-sm text-red-200">
                {error}
              </div>
            )}
          </div>

          {/* Resultado */}
          <AnswerBlock data={result} />

          {/* Botón Sugerencias */}
          <div className="mt-12">
            <button
              onClick={() => navigate("/sugerencias")}
              className="px-6 py-3 rounded-xl font-extrabold text-white flex items-center gap-2 mx-auto"
              style={{ backgroundColor: "#59d2e6", boxShadow: "0 8px 22px rgba(89,210,230,.30)" }}
              aria-label="Sugerencias"
              title="Sugerencias"
            >
              👋 Sugerencias
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
