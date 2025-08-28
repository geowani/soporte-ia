import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Sugerencias() {
  const [caso, setCaso] = useState("");
  const navigate = useNavigate();

const onSubmit = (e) => {
  e.preventDefault();
  if (!caso.trim()) return alert("Ingresa el número de caso");
  // aquí podrías llamar a la API si quieres; por ahora solo navegamos
  navigate("/confirmacion", { state: { caso } });
};

  return (
    <main className="min-h-screen w-full relative overflow-hidden text-white">
      <div
        className="absolute inset-0 -z-20"
        style={{
          backgroundImage: "url('/fondo.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <button
        onClick={() => navigate("/dashboard")}
        className="absolute right-6 top-6 px-5 py-2 rounded-full bg-red-500/90 hover:bg-red-600 font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-white/50"
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
              En este espacio puedes sugerir la inclusión de casos repetitivos
              que aún no hayan sido agregados
            </p>

            <form onSubmit={onSubmit} className="flex flex-col items-center gap-4">
              <label className="w-full max-w-md text-xl font-semibold">Número de Caso</label>
              <input
                type="text"
                inputMode="numeric"
                className="w-full max-w-md rounded-full bg-slate-100 text-slate-900 px-4 py-3 outline-none shadow-inner shadow-black/10 focus:ring-4 ring-cyan-300 text-center tracking-widest"
                placeholder="Caso"
                value={caso}
                onChange={(e) => setCaso(e.target.value)}
              />
              <button
                type="submit"
                className="mt-2 w-40 h-11 rounded-xl font-semibold text-[#0b2230]"
                style={{ backgroundColor: "#59d2e6", boxShadow: "0 8px 22px rgba(89,210,230,.30)" }}
              >
                Enviar
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
