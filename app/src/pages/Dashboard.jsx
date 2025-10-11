// app/src/pages/Dashboard.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard({ onLogout }) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  // --- obtiene userId ---
  function getUserId() {
    const raw = localStorage.getItem("userId");
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  // --- cierre de sesión ---
  const handleLogout = useCallback(() => {
    localStorage.removeItem("userId");
    onLogout?.();
  }, [onLogout]);

  // --- registra búsqueda (sin bloquear) ---
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

  // --- búsqueda principal ---
  const ejecutarBusqueda = useCallback(() => {
    const term = q.trim();
    if (!term) {
      alert("Por favor ingresa un término para buscar");
      return;
    }

    registrarBusqueda(term);
    navigate(`/resultados?q=${encodeURIComponent(term)}`);
  }, [q, navigate]);

  // --- atajos de teclado ---
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
