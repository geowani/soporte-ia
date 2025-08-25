import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const MOCK_CASOS = [
  { id: "1052505", area: "SYS", descripcion: "Usuario no puede iniciar sesion" },
  { id: "0895420", area: "PC",  descripcion: "Usuario no puede cerrar una orden de reparación" },
  { id: "1024156", area: "PC",  descripcion: "Usuario no puede recibir mensaje de verificación." },
  { id: "1010518", area: "NET", descripcion: "Intermitencia al acceder al portal interno" },
];

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function Resultados() {
  const q = useQuery().get("q")?.trim() || "";
  const navigate = useNavigate();

  // Filtro simple por id o texto (case-insensitive)
  const results = useMemo(() => {
    if (!q) return MOCK_CASOS;
    const s = q.toLowerCase();
    return MOCK_CASOS.filter(
      c => c.id.includes(q) || c.descripcion.toLowerCase().includes(s)
    );
  }, [q]);

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
          onClick={() => navigate("/dashboard")}
          className="text-white font-semibold tracking-wide hover:opacity-90"
        >
          REGRESAR
        </button>
      </div>

      {/* Contenido */}
      <div className="mt-4 px-6 md:px-10">
        {/* “input” solo mostrando la consulta */}
        <input
          value={q || "Usuario bloqueado"}
          readOnly
          className="w-[min(640px,95vw)] rounded-full bg-white/85 text-slate-900 px-4 py-2 outline-none shadow-inner shadow-black/10"
        />

        {/* Caja de resultados */}
        <div className="mt-5 w-[min(980px,95vw)] rounded-2xl bg-slate-200/85 text-slate-900 p-5 md:p-6 border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,.35)]">
          <div className="font-bold text-lg mb-3">Resultados:</div>

          {results.length === 0 && (
            <div className="text-slate-700">Sin coincidencias para “{q}”.</div>
          )}

          {results.map((c, i) => (
            <div key={c.id} className="py-3">
              <div className="flex items-start justify-between">
                <a
                  className="text-blue-600 font-bold hover:underline"
                  href="#"
                  onClick={(e) => e.preventDefault()}
                >
                  Caso: {c.id}
                </a>
                <span className="text-blue-600 font-semibold">{c.area}</span>
              </div>
              <div className="text-blue-600 mt-1">
                Descripcion: {c.descripcion}
              </div>

              {/* Separador */}
              {i < results.length - 1 && (
                <div className="mt-3 h-px bg-slate-500/60 w-full"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
