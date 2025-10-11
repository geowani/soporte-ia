// app/src/pages/Dashboard.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Dashboard({ onLogout }) {
  const nav = useNavigate();
  const loc = useLocation();

  const [q, setQ] = useState("");
  const [displayName, setDisplayName] = useState(() => getInitialName(loc));

  // ========= Helpers =========
  function getUserId() {
    const raw = localStorage.getItem("userId");
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  function pickName(any) {
    // normaliza nombres de propiedad típicos
    return (
      any?.agente ||
      any?.nombre_completo ||
      any?.NOMBRE_COMPLETO ||
      any?.nombre ||
      any?.NOMBRE ||
      any?.fullName ||
      any?.usuario_nombre ||
      any?.userName ||
      any?.username ||
      any?.correo ||
      any?.email ||
      null
    );
  }

  function getInitialName(locationObj) {
    // 1) si el login navegó con estado: navigate('/dashboard', { state: { agente: '...' } })
    const fromState = pickName(locationObj?.state) || locationObj?.state?.agente;
    if (fromState && String(fromState).trim()) {
      sessionStorage.setItem("dup_agent", String(fromState).trim());
      localStorage.setItem("nombreUsuario", String(fromState).trim());
      return String(fromState).trim();
    }

    // 2) session/local storage (todas las claves comunes)
    const keys = [
      "dup_agent",
      "nombreUsuario",
      "nombre",
      "usuario_nombre",
      "userName",
      "username",
      "correo",
      "email",
    ];
    for (const k of keys) {
      const v =
        (k === "dup_agent"
          ? sessionStorage.getItem(k)
          : localStorage.getItem(k)) || null;
      if (v && v.trim()) return v.trim();
    }

    return "Usuario";
  }

  async function resolveNameFromAPI() {
    if (displayName && displayName !== "Usuario") return;

    const userId = getUserId();
    const headers = { "Content-Type": "application/json" };
    if (userId != null) headers["x-user-id"] = String(userId);

    // Rutas candidatas típicas en APIs sin JWT
    const candidates = [
      userId != null ? `/api/usuario/${userId}` : null,
      userId != null ? `/api/usuarios/${userId}` : null,
      userId != null ? `/api/usuarios/detalle?id=${encodeURIComponent(userId)}` : null,
      `/api/whoami`,
      userId != null ? `/api/whoami?userId=${encodeURIComponent(userId)}` : null,
      userId != null ? `/api/empleado/${userId}` : null,
    ].filter(Boolean);

    for (const url of candidates) {
      try {
        const r = await fetch(url, { headers });
        console.log("[Dashboard] GET", url, r.status);
        if (!r.ok) continue;

        const data = await r.json();
        console.log("[Dashboard] Respuesta", url, data);

        const name = pickName(data) || pickName(data?.data) || pickName(data?.usuario);
        if (name && String(name).trim()) {
          const clean = String(name).trim();
          sessionStorage.setItem("dup_agent", clean);
          localStorage.setItem("nombreUsuario", clean);
          setDisplayName(clean);
          return;
        }
      } catch (e) {
        console.warn("[Dashboard] Error consultando", url, e);
      }
    }

    console.warn(
      "[Dashboard] No se pudo resolver nombre. Sugerencia: guarda nombre en login -> sessionStorage.setItem('dup_agent', nombre)"
    );
  }

  // ========= Efectos =========
  useEffect(() => {
    if (!displayName || displayName === "Usuario") {
      resolveNameFromAPI();
    }
  }, [displayName]);

  // ========= Logout =========
  const handleLogout = useCallback(() => {
    localStorage.removeItem("userId");
    ["nombreUsuario", "nombre", "usuario_nombre", "userName", "username", "correo", "email"].forEach(k =>
      localStorage.removeItem(k)
    );
    sessionStorage.removeItem("dup_agent");
    onLogout?.();
  }, [onLogout]);

  // ========= Registrar búsqueda =========
  async function registrarBusqueda(term) {
    const userId = getUserId();
    const texto = String(term ?? "").trim();
    if (!texto) return;

    try {
      const headers = { "Content-Type": "application/json" };
      if (userId != null) headers["x-user-id"] = String(userId);
      const body = { q: texto, usuarioId: userId ?? null };

      fetch("/api/busqueda-evento-registrar", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }).catch(() => {});
    } catch {}
  }

  // ========= Búsqueda principal =========
  const ejecutarBusqueda = useCallback(() => {
    const term = q.trim();
    if (!term) {
      alert("Por favor ingresa un término para buscar");
      return;
    }
    registrarBusqueda(term);
    nav(`/resultados?q=${encodeURIComponent(term)}`);
  }, [q, nav]);

  // ========= Atajos =========
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

  // ========= UI =========
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
      <style>{`@keyframes float { 0%{transform:translateY(0)} 50%{transform:translateY(-10px)} 100%{transform:translateY(0)} }`}</style>

      {/* Saludo */}
      <div
        className="absolute left-6 top-6 rounded-xl px-4 py-2"
        style={{ backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
        aria-live="polite"
      >
        <span className="text-sm opacity-90">👋 Bienvenido,</span>{" "}
        <strong className="font-semibold">{displayName}</strong>
      </div>

      {/* Botón salir */}
      <button
        onClick={handleLogout}
        className="absolute right-6 top-6 px-5 py-2 rounded-full bg-red-500/90 hover:bg-red-600 font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        Salir
      </button>

      {/* Contenido */}
      <div className="min-h-screen grid place-items-center p-6">
        <section className="w-full max-w-4xl text-center">
          <h1 className="text-6xl md:text-7xl font-extrabold tracking-widest drop-shadow-[0_10px_40px_rgba(0,0,0,.6)]">
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
              />
              <button
                onClick={ejecutarBusqueda}
                className="m-1 h-10 w-10 rounded-full grid place-items-center bg-slate-300/80 hover:scale-105 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 fill-slate-700">
                  <path d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 0 0 1.57-4.23C16 6.01 12.99 3 9.5 3S3 6.01 3 9.5 6.01 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99 1.49-1.49-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Botón sugerencias */}
          <div className="mt-12">
            <button
              onClick={() => nav("/sugerencias")}
              className="px-6 py-3 rounded-xl font-extrabold text-white flex items-center gap-2 mx-auto"
              style={{ backgroundColor: "#59d2e6", boxShadow: "0 8px 22px rgba(89,210,230,.30)" }}
            >
              👋 Sugerencias
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
