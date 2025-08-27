// app/src/pages/AdminAgentes.jsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminAgentes() {
  const nav = useNavigate();

  // 🧪 Mock temporal (luego lo cambiamos por API)
  const data = useMemo(
    () => [
      { nombre: "Lester Estrada", busquedas: 10 },
      { nombre: "Abner Zepeda",   busquedas: 15 },
      { nombre: "Jorge Nufio",    busquedas: 5 },
      { nombre: "María Romero",   busquedas: 8 },
      { nombre: "Luis Pacheco",   busquedas: 6 },
    ],
    []
  );

  return (
    <main className="min-h-screen w-full relative overflow-hidden text-white">
      {/* Fondo igual al admin/login */}
      <div
        className="absolute inset-0 -z-20"
        style={{
          backgroundImage: "url('/fondo.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
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
          animation: "float 12s linear infinite"
        }}
      />
      <style>{`@keyframes float { 0%{transform:translateY(0)} 50%{transform:translateY(-10px)} 100%{transform:translateY(0)} }`}</style>

      <div className="min-h-screen grid place-items-center p-6">
        <section className="w-full max-w-4xl rounded-2xl border border-white/20 p-8 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,.45)] bg-white/90 text-black">
          {/* Encabezado */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl md:text-4xl font-extrabold uppercase">
              Agentes con más búsquedas
            </h1>
            <button
              onClick={() => nav("/admin")}
              className="text-white bg-black/70 px-4 py-2 rounded-lg font-semibold hover:bg-black"
            >
              Regresar
            </button>
          </div>

          {/* Tabla simple */}
          <div className="rounded-xl bg-gray-200 p-4 md:p-6">
            <div className="grid grid-cols-[1fr_auto] items-center px-2 md:px-4 pb-3 text-gray-700 font-semibold">
              <span>Agente:</span>
              <span>Buscas realizadas:</span>
            </div>
            <ul className="divide-y divide-black/50">
              {data.map((a, i) => (
                <li key={i} className="grid grid-cols-[1fr_auto] items-center py-5 px-2 md:px-4">
                  <span className="text-lg md:text-xl font-semibold">{a.nombre}</span>
                  <span className="text-lg md:text-xl font-bold">{a.busquedas}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
