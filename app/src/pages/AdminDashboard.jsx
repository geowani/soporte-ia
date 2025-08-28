// app/src/pages/AdminDashboard.jsx
import { useNavigate } from "react-router-dom";

export default function AdminDashboard({ onLogout }) {
  const nav = useNavigate();

  return (
    <main className="min-h-screen w-full relative overflow-hidden text-white">
      {/* Fondo con la misma configuración que el login */}
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

      {/* Contenedor central */}
      <div className="min-h-screen grid place-items-center p-6">
        <section className="w-full max-w-4xl rounded-2xl border border-white/20 p-12 md:p-16 shadow-[0_20px_60px_rgba(0,0,0,.45)] bg-white/10 backdrop-blur-md text-white">
          {/* Header */}
          <div className="flex justify-between items-center mb-10">
            <h1 className="text-4xl font-extrabold">Administrador</h1>
            <button
              onClick={onLogout}
              className="font-semibold text-blue-600 hover:underline text-lg"
              type="button"
            >
              Salir
            </button>
          </div>

          {/* Opciones */}
          <div className="flex flex-col gap-8">
            <button
              type="button"
              onClick={() => nav("/admin/agentes")}
              className="text-blue-600 font-semibold text-left border-b border-black pb-3 text-xl"
            >
              Agentes con más búsquedas
            </button>

            <button
              type="button"
             onClick={() => nav("/admin/agregar-caso")}
            className="text-blue-600 font-semibold text-left border-b border-black pb-3 text-xl"
            >
              Agregar caso al sistema
            </button>

            <button
              type="button"
              onClick={() => nav("/admin/sugerencias")}
              className="text-blue-600 font-semibold text-left border-b border-black pb-3 text-xl"
            >
              Revisar las sugerencias
            </button>

            <button
              type="button"
              onClick={() => nav("/admin/historial")}
              className="text-blue-600 font-semibold text-left border-b border-black pb-3 text-xl"
            >
              Historial de casos
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
