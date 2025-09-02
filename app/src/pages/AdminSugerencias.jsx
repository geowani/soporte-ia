// app/src/pages/AdminSugerencias.jsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminSugerencias() {
  const nav = useNavigate();

  // 🧪 mock (luego lo cambiamos por API)
  const filas = useMemo(
    () => [
      { caso: "0984510", agente: "Lester Estrada" },
      { caso: "1089210", agente: "Abner Zepeda" },
      { caso: "0841231", agente: "Jorge Nufio" },
      { caso: "098999",  agente: "María Romero" },
      { caso: "1058730", agente: "Luis Pacheco" },
    ],
    []
  );

  return (
    <main className="min-h-screen w-full relative overflow-hidden">
      {/* fondo + partículas */}
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
      <div className="absolute inset-0 -z-[9] bg-black/40" />
      <style>{`@keyframes float{0%{transform:translateY(0)}50%{transform:translateY(-10px)}100%{transform:translateY(0)}}`}</style>

      <div className="min-h-screen grid place-items-center p-6">
        {/* tarjeta estilo vidrio */}
        <section className="w-full max-w-5xl rounded-2xl border border-white/20 p-10 md:p-14 bg-white/10 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,.55)]">
          {/* header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold uppercase text-white">
              Lista de sugerencias
            </h1>
            <button
              onClick={() => nav("/admin")}
              className="px-5 py-2 rounded-full bg-red-500/90 hover:bg-red-600 text-white font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              Regresar
            </button>
          </div>

          {/* tabla */}
          <div className="rounded-2xl bg-gray-100 p-6 md:p-8 text-black">
            <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_1fr] items-center px-2 md:px-4 pb-3 font-bold text-gray-800">
              <span>Casos</span>
              <span className="text-right md:text-left">Agente:</span>
            </div>
            <ul className="divide-y divide-gray-300">
              {filas.map((f, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_1fr] items-center py-5 px-2 md:px-4"
                >
                  <span className="text-lg md:text-xl font-normal">{f.caso}</span>
                  <span className="text-lg md:text-xl font-medium md:text-left text-right">
                    {f.agente}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
