// app/src/pages/Dashboard.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard({ onLogout }) {
  const [q, setQ] = useState("");
  const [nombreUsuario, setNombreUsuario] = useState("Luis Marín");
  const navigate = useNavigate();

  // =====================
  // Helpers de sesión
  // =====================

  // Obtiene userId (como tenías)
  function getUserId() {
    const raw = localStorage.getItem("userId");
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  // Convierte "lUiS mArIn" -> "Luis Marin"
  function toTitleCase(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\b([a-záéíóúñü])([a-záéíóúñü]*)/gi, (_, f, r) => f.toUpperCase() + r);
  }

  // Intenta armar un nombre "bonito" desde múltiples campos posibles
  function buildName(u) {
    if (!u || typeof u !== "object") return "";
    const candidates = [
      u.nombreCompleto,
      u.nombre_completo,
      u.fullName,
      u.full_name,
      u.displayName,
      u.display_name,
      u.nombre,
      u.name,
      [u.first_name, u.last_name].filter(Boolean).join(" "),
      [u.firstName, u.lastName].filter(Boolean).join(" "),
      [u.given_name, u.family_name].filter(Boolean).join(" "),
      u.agenteNombre,
      u.username, // último recurso
    ]
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean);

    const chosen = candidates[0] || "";
    return toTitleCase(chosen);
  }

  // Lee nombre del usuario desde localStorage/cookie
  function getUserName() {
    try {
      // claves comunes
      const raw =
        localStorage.getItem("user") ||
        localStorage.getItem("usuario") ||
        localStorage.getItem("authUser") ||
        localStorage.getItem("profile") ||
        "";

      if (raw) {
        try {
          const u = JSON.parse(raw);
          const built = buildName(u);
          if (built) return built;

          // si no se pudo, intenta con email -> antes de @
          const email = (u?.correo || u?.email || "").toString().trim();
          if (email && email.includes("@")) {
            const before = email.split("@")[0].replace(/[._-]+/g, " ");
            return toTitleCase(before);
          }
        } catch {
          // si estaba guardado como string plano, úsalo
          if (raw && raw.length <= 60) return toTitleCase(raw);
        }
      }
    } catch {}

    // cookie user_name=...
    const m = document.cookie.match(/(?:^|;\s*)user_name=([^;]+)/);
    if (m) return toTitleCase(decodeURIComponent(m[1]));

    return "";
  }

  // Devuelve el primer nombre de un nombre completo
  function getFirstName(full) {
    return String(full || "").trim().split(/\s+/)[0] || "Usuario";
  }

  // =====================
  // Logout
  // =====================
  const handleLogout = useCallback(() => {
    // limpia varias claves típicas
    localStorage.removeItem("userId");
    localStorage.removeItem("user");
    localStorage.removeItem("usuario");
    localStorage.removeItem("authUser");
    localStorage.removeItem("profile");
    onLogout?.();
  }, [onLogout]);

  // =====================
  // Registro de búsqueda
  // =====================
  async function registrarBusqueda(term) {
    const userId = getUserId();
    const texto = String(term ?? "").trim();
    if (!texto) return;

    try {
      const headers = { "Content-Type": "application/json" };
      if (userId != null) headers["x-user-id"] = String(userId);

      const body = { q: texto, usuarioId: userId ?? null };

      // sin await -> se ejecuta en segundo plano
      fetch("/api/busqueda-evento-registrar", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }).catch(() => {});
    } catch {}
  }

  // =====================
  // Búsqueda principal
  // =====================
  const ejecutarBusqueda = useCallback(() => {
    const term = q.trim();
    if (!term) {
      alert("Por favor ingresa un término para buscar");
      return;
    }

    registrarBusqueda(term);
    navigate(`/resultados?q=${encodeURIComponent(term)}`);
  }, [q, navigate]);

  // =====================
  // Atajos de teclado
  // =====================
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

  // =====================
  // Cargar nombre al montar
  // =====================
  useEffect(() => {
    const n = getUserName() || "Luis Marín";
    setNombreUsuario(n);
  }, []);

  const primerNombre = getFirstName(nombreUsuario);

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

      {/* Bienvenida (lado izquierdo superior) */}
      <div className="absolute left-6 top-6 text-white">
        <span className="block text-2xl font-bold leading-tight drop-shadow">
          Hola {primerNombre},
        </span>
        <span className="block text-sm opacity-80 leading-none">
          ¿En qué te puedo ayudar hoy?
        </span>
      </div>

      {/* Botón salir */}
      <button
        onClick={handleLogout}
        className="absolute right-6 top-6 px-5 py-2 rounded-full bg-red-500/90 hover:bg-red-600 font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        Cerrar Sesión
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
                placeholder="Busca por caso, título o error"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button
                onClick={ejecutarBusqueda}
                className="m-1 h-10 w-10 rounded-full grid place-items-center bg-slate-300/80 hover:scale-105 transition"
                aria-label="Buscar"
                title="Buscar"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-5 w-5 fill-slate-700"
                >
                  <path d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 0 0 1.57-4.23C16 6.01 12.99 3 9.5 3S3 6.01 3 9.5 6.01 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99 1.49-1.49-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Botón sugerencias */}
          <div className="mt-12">
            <button
              onClick={() => navigate("/sugerencias")}
              className="px-6 py-3 rounded-xl font-extrabold text-white flex items-center gap-2 mx-auto"
              style={{
                backgroundColor: "#59d2e6",
                boxShadow: "0 8px 22px rgba(89,210,230,.30)",
              }}
            >
              👋 Sugerencias
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
