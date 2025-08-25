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
  const fromQ = location.state?.fromQ || ""; // para regresar a los resultados con la búsqueda previa

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

      {/* Buscador “sólo lectura” con el término anterior si lo hubo */}
      <div className="mt-4 px-6 md:px-10">
        <input
          value={fromQ || "Usuario bloqueado"}
          readOnly
          className="w-[min(640px,95vw)] rounded-full bg-white/85 text-slate-900 px-4 py-2 outline-none shadow-inner shadow-black/10"
        />
      </div>

      {/* Contenido */}
      <div className="mt-4 px-6 md:px-10">
        <div className="w-[min(980px,95vw)] rounded-2xl bg-slate-200/90 text-slate-900 p-6 border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,.35)]">
          {!caso ? (
            <div className="text-slate-800">
              No se encontró el caso <b>{id}</b>.
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div className="font-bold">Caso: {caso.id}</div>
                <div className="text-right">
                  <div>Inicio: {fmt(caso.inicio)}</div>
                  <div>Cierre: {fmt(caso.cierre)}</div>
                </div>
              </div>

              <div className="mt-4 font-bold">Descripción:</div>
              <p className="mt-1 leading-relaxed">
                {caso.descripcion}
              </p>

              <div className="mt-4 font-bold">Solución:</div>
              <p className="mt-1 leading-relaxed">
                {caso.solucion}
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
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
