// app/src/pages/SugerenciaExiste.jsx
import { useLocation, useNavigate } from "react-router-dom";

export default function SugerenciaExiste() {
  const { state } = useLocation();
  const nav = useNavigate();

  const caso = state?.caso || sessionStorage.getItem("dup_case") || "";
  const id     = (state?.id ?? Number(sessionStorage.getItem("dup_id"))) || null;
  const agente = state?.agente || sessionStorage.getItem("dup_agent") || "";

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

      {/* Botón regresar */}
      <button
        onClick={() => nav("/sugerencias")}
        className="absolute right-6 top-6 px-5 py-2 rounded-full bg-red-500/90 hover:bg-red-600 text-white font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        REGRESAR
      </button>

      <div className="min-h-screen grid place-items-center p-6">
        <section className="w-full max-w-2xl text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-6">
            SUGERENCIAS DE CASOS
          </h1>

          <div className="mx-auto w-full rounded-2xl bg-black/30 backdrop-blur-md p-6 sm:p-8 border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,.45)]">
            <p className="text-slate-200 leading-relaxed mb-6">
              Este número de caso <span className="font-bold">ya fue sugerido</span> y se encuentra
              bajo revisión.
            </p>

            <div className="text-2xl sm:text-3xl font-semibold mb-2">
              Caso sugerido: <span className="font-mono tracking-widest">{caso}</span>
            </div>

            {id ? (
              <div className="text-lg mb-4">ID existente: <b>{id}</b></div>
            ) : null}

            {agente ? (
              <div className="text-base mb-6 text-white/80">Agente: {agente}</div>
            ) : null}

            <div className="text-6xl">❌</div>
          </div>
        </section>
      </div>
    </main>
  );
}
