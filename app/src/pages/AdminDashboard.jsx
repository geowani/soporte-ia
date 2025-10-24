// app/src/pages/AdminDashboard.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard({ onLogout }) {
  const nav = useNavigate();
  const [nombreUsuario, setNombreUsuario] = useState("Usuario");

  // ===== Helpers iguales a Dashboard =====
  function toTitleCase(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\b([a-záéíóúñü])([a-záéíóúñü]*)/gi, (_, f, r) => f.toUpperCase() + r);
  }

  function buildName(u) {
    if (!u || typeof u !== "object") return "";
    const candidates = [
      u.nombreCompleto, u.nombre_completo, u.fullName, u.full_name,
      u.displayName, u.display_name, u.nombre, u.name,
      [u.first_name, u.last_name].filter(Boolean).join(" "),
      [u.firstName, u.lastName].filter(Boolean).join(" "),
      [u.given_name, u.family_name].filter(Boolean).join(" "),
      u.agenteNombre, u.username
    ]
      .map(x => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean);

    const chosen = candidates[0] || "";
    return toTitleCase(chosen);
  }

  function getUserName() {
    try {
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

          const email = (u?.correo || u?.email || "").toString().trim();
          if (email && email.includes("@")) {
            const before = email.split("@")[0].replace(/[._-]+/g, " ");
            return toTitleCase(before);
          }
        } catch {
          if (raw && raw.length <= 60) return toTitleCase(raw);
        }
      }
    } catch {}

    const m = document.cookie.match(/(?:^|;\s*)user_name=([^;]+)/);
    if (m) return toTitleCase(decodeURIComponent(m[1]));
    return "";
  }

  function getFirstName(full) {
    return String(full || "").trim().split(/\s+/)[0] || "Usuario";
  }

  const handleLogout = useCallback(() => {
    localStorage.removeItem("userId");
    localStorage.removeItem("user");
    localStorage.removeItem("usuario");
    localStorage.removeItem("authUser");
    localStorage.removeItem("profile");
    onLogout?.();
  }, [onLogout]);

  useEffect(() => {
    const n = getUserName() || "Usuario";
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

      {/* Bienvenida (esquina superior izquierda) */}
      <div className="absolute left-6 top-6 text-white">
        <span className="block text-2xl font-bold leading-tight drop-shadow">
          Hola {primerNombre},
        </span>
        <span className="block text-sm opacity-80 leading-none">
          ¿En qué te puedo ayudar hoy?
        </span>
      </div>

      {/* Botón salir (esquina superior derecha) */}
      <button
        onClick={handleLogout}
        className="absolute right-6 top-6 px-5 py-2 rounded-full bg-red-500/90 hover:bg-red-600 font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        Cerrar Sesión
      </button>

      {/* Contenedor central */}
      <div className="min-h-screen grid place-items-center p-6">
        <section className="relative w-full max-w-5xl rounded-2xl border border-white/20 p-12 md:p-16 shadow-[0_20px_60px_rgba(0,0,0,.45)] bg-white/10 backdrop-blur-md">
          {/* Header */}
          <div className="flex justify-between items-center mb-10">
            <h1 className="text-4xl md:text-5xl font-extrabold">Panel de Administrador</h1>
            <span className="hidden md:block text-white/80">
            </span>
          </div>

          {/* Opciones */}
          <nav className="flex flex-col gap-6">
            <button
              type="button"
              onClick={() => nav("/admin/agentes")}
              className="text-white-300 hover:text-white-300 font-normal text-left border-b border-white/20 pb-3 text-xl transition-transform hover:translate-x-0.5"
            >
              Agentes con más búsquedas
            </button>

            <button
              type="button"
              onClick={() => nav("/admin/agregar-caso")}
              className="text-white-300 hover:text-white-300 font-normal text-left border-b border-white/20 pb-3 text-xl transition-transform hover:translate-x-0.5"
            >
              Agregar caso al sistema
            </button>

            <button
              type="button"
              onClick={() => nav("/admin/sugerencias")}
              className="text-white-300 hover:text-white-300 font-normal text-left border-b border-white/20 pb-3 text-xl transition-transform hover:translate-x-0.5"
            >
              Revisar las sugerencias
            </button>

            <button
              type="button"
              onClick={() => nav("/admin/historial")}
              className="text-white-300 hover:text-white-300 font-normal text-left border-b border-white/20 pb-3 text-xl transition-transform hover:translate-x-0.5"
            >
              Últimos casos agregados
            </button>
          </nav>
        </section>
      </div>
    </main>
  );
}
