import { useNavigate } from "react-router-dom";

export default function Confirmacion() {
  const navigate = useNavigate();

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

      {/* Botón regresar (posicionado a la derecha) */}
      <button
        onClick={() => navigate("/sugerencias")}
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
              Muchas gracias por tu sugerencia.  
              La tendremos en cuenta y estará bajo revisión
            </p>

            <div className="text-5xl">✅</div>
          </div>
        </section>
      </div>
    </main>
  );
}
