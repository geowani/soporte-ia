import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { CASOS } from "../data/casos";

function fmt(fecha) {
  try {
    const d = new Date(fecha + "T00:00:00");
    return d.toLocaleDateString();
  } catch { return fecha; }
}

export default function CasoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromQ = location.state?.fromQ || "";

  const caso = useMemo(() => CASOS.find(c => c.id === id), [id]);

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

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 md:px-10 pt-6">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-wide drop-shadow">
          BASE DE CASOS
        </h1>
        <button
          onClick={() => {
            if (fromQ) navigate(`/resultados?q=${encodeURIComponent(fromQ)}`);
            else navigate("/resultados");
          }}
          className="text-white font-semibold tracking-wide hover:opacity-90"
        >
          REGRESAR
        </button>
      </div>

      {/* Buscador centrado */}
      <div className="mt-4 px-4">
        <input
          value={fromQ || "Usuario bloqueado"}
          readOnly
          className="w-full max-w-3xl mx-auto block rounded-full bg-white/85 text-slate-900 px-4 py-3 outline-none shadow-inner shadow-black/10"
        />
      </div>

      {/* Tarjeta centrada */}
      <div className="mt-5 px-4 pb-8">
        <div className="w-full max-w-5xl mx-auto rounded-2xl bg-slate-200/90 text-slate-900 p-6 md:p-8 border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,.35)]">
          {!caso ? (
            <div className="text-slate-800">
              No se encontró el caso <b>{id}</b>.
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="font-bold text-lg">Caso: {caso.id}</div>
                <div className="text-right">
                  <div>Inicio: {fmt(caso.inicio)}</div>
                  <div>Cierre: {fmt(caso.cierre)}</div>
                </div>
              </div>

              <div className="mt-6 font-bold">Descripción:</div>
              <p className="mt-1 leading-relaxed">
                {caso.descripcion}
              </p>

              <div className="mt-6 font-bold">Solución:</div>
              <p className="mt-1 leading-relaxed">
                {caso.solucion}
              </p>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="font-bold">Resuelto por:</div>
                  <div>{caso.resueltoPor}</div>
                </div>
                <div>
                  <div className="font-bold">Departamento:</div>
                  <div>{caso.departamento}</div>
                </div>
                <div>
                  <div className="font-bold">Nivel:</div>
                  <div>{caso.nivel}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
