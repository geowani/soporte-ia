// app/src/pages/AdminHistorial.jsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminHistorial() {
  const nav = useNavigate();

  const data = useMemo(
    () => [
      { id: "0984510", titulo: "SYS || Puerto bloqueado", agregado: "Admin 1" },
      { id: "1089210", titulo: "PC || Instalacion de Chromium", agregado: "Admin 2" },
      { id: "0841231", titulo: "HW || Impresora toner bajo", agregado: "Admin 1" },
      { id: "098999",  titulo: "PC || Drive no abre", agregado: "Admin 2" },
      { id: "1058730", titulo: "HW || Error A42.21.10", agregado: "Admin 1" },
    ],
    []
  );

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
      <style>{`@keyframes float {0%{transform:translateY(0)}50%{transform:translateY(-10px)}100%{transform:translateY(0)}}`}</style>

      <div className="min-h-screen grid place-items-center p-6">
        <section className="w-full max-w-6xl rounded-2xl border border-white/20 p-10 md:p-14 shadow-[0_20px_60px_rgba(0,0,0,.45)] bg-white/10 backdrop-blur-md">
          {/* Encabezado */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold uppercase text-white">
              Lista de Últimos Casos Agregados
            </h1>
            <button
              onClick={() => nav("/admin")}
              className="px-5 py-2 rounded-full bg-red-500/90 hover:bg-red-600 text-white font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              Regresar
            </button>
          </div>

          {/* Tabla */}
          <div className="rounded-xl bg-gray-200 text-black p-6 md:p-8">
            <div className="grid grid-cols-[1fr_2fr_1fr] items-center px-2 md:px-4 pb-3 font-bold">
              <span>Casos</span>
              <span>Título</span>
              <span>Agregado por</span>
            </div>
            <ul className="divide-y divide-black/40">
              {data.map((c, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[1fr_2fr_1fr] items-center py-4 px-2 md:px-4"
                >
                  <span className="font-normal">{c.id}</span> {/* 👈 ahora normal */}
                  <span>{c.titulo}</span>
                  <span>{c.agregado}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
