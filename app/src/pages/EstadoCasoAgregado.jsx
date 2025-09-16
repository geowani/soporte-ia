import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

function useQS() {
  const { search, state } = useLocation();
  // soporta querystring y/o state al navegar
  const qs = useMemo(() => new URLSearchParams(search), [search]);
  const idFromQS = qs.get("id");
  return { id: state?.id ?? idFromQS };
}

export default function EstadoCasoAgregado() {
  const { id } = useQS();
  const nav = useNavigate();

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
        onClick={() => nav(-1)}
        className="absolute right-6 top-6 z-10 px-5 py-2 rounded-full bg-white/15 hover:bg-white/25 font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        REGRESAR
      </button>

      <div className="min-h-screen grid place-items-center p-6">
        <section className="w-full max-w-4xl">
          <h1 className="text-center text-3xl md:text-4xl font-extrabold mb-8">
            Panel de Administrador
          </h1>

          <div className="mx-auto max-w-2xl rounded-2xl bg-white/10 border border-white/20 p-10 md:p-12 text-center shadow-[0_20px_60px_rgba(0,0,0,.45)] backdrop-blur-md">
            <p className="text-xl md:text-2xl font-semibold leading-relaxed">
              Muchas gracias, su caso fue agregado exitosamente al sistema.
            </p>

            <div className="text-7xl mt-6">✅</div>

            {id && (
              <p className="mt-4 text-white/90">
                ID del caso: <b>{id}</b>
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
