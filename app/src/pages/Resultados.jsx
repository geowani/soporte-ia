import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Puedes sustituir esto por un import desde ../data/casos si ya creaste el dataset
const MOCK_CASOS = [
  { id: "1052505", area: "SYS", descripcion: "Usuario no puede iniciar sesion" },
  { id: "0895420", area: "PC",  descripcion: "Usuario no puede cerrar una orden de reparación" },
  { id: "1024156", area: "PC",  descripcion: "Usuario no puede recibir mensaje de verificación." },
  { id: "1010518", area: "NET", descripcion: "Intermitencia al acceder al portal interno" },
];

export default function Resultados() {
  const location = useLocation();
  const navigate = useNavigate();

  // Lee q de la URL y sincroniza el input
  const urlQ = new URLSearchParams(location.search).get("q") || "";
  const [q, setQ] = useState(urlQ);

  useEffect(() => { setQ(urlQ); }, [urlQ]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return MOCK_CASOS.filter(
      c => c.id.includes(s) || c.descripcion.toLowerCase().includes(s)
    );
  }, [q]);

  const doSearch = () => {
    const term = q.trim();
    if (!term) return;
    // Actualiza la URL (compartible / recargable)
    navigate(`/resultados?q=${encodeURIComponent(term)}`, { replace: true });
  };

  // Enter para buscar
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
          className="absolute right-6 top-6 px-5 py-2 rounded-full bg-red-500/90 hover:bg-red-600 font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-white/50"
        >
          REGRESAR
        </button>
      </div>

      {/* CONTENIDO CENTRADO */}
      <div className="mt-6 px-4 w-full flex flex-col items-center">
        {/* Buscador centrado (mismo estilo del dashboard) */}
        <div className="w-full max-w-3xl flex items-center rounded-full bg-white/85 text-slate-900 overflow-hidden shadow-inner shadow-black/10">
          <input
            className="flex-1 bg-transparent px-4 py-3 outline-none placeholder:text-slate-600"
            type="text"
            placeholder="Busca por título, id o síntoma"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Barra de búsqueda"
          />
          <button
            onClick={doSearch}
            className="m-1 h-10 w-10 rounded-full grid place-items-center bg-slate-300/80 hover:scale-105 transition"
            aria-label="Buscar"
            title="Buscar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 fill-slate-700">
              <path d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 0 0 1.57-4.23C16 6.01 12.99 3 9.5 3S3 6.01 3 9.5 6.01 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99 1.49-1.49-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </button>
        </div>

        {/* Caja de resultados centrada + autoajustable con scroll */}
        <div className="mt-5 w-full max-w-4xl rounded-2xl bg-slate-200/85 text-slate-900 p-5 md:p-6 border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,.35)]">
          <div className="font-bold text-lg mb-3">Resultados:</div>

          {!q.trim() && (
            <div className="text-slate-700">Escribe un término para buscar.</div>
          )}

          {q.trim() && results.length === 0 && (
            <div className="text-slate-700">Sin coincidencias para “{q}”.</div>
          )}

          <div className="max-h-[60vh] overflow-y-auto pr-2">
            {results.map((c, i) => (
              <div key={c.id} className="py-3">
                <div className="flex items-start justify-between">
                  {/* Navega al detalle con la búsqueda actual */}
                  <button
                    onClick={() => navigate(`/caso/${c.id}`, { state: { fromQ: q } })}
                    className="text-blue-600 font-bold hover:underline text-left"
                  >
                    Caso: {c.id}
                  </button>
                  <span className="text-blue-600 font-semibold">{c.area}</span>
                </div>
                <div className="text-blue-600 mt-1">
                  Descripción: {c.descripcion}
                </div>
                {i < results.length - 1 && (
                  <div className="mt-3 h-px bg-slate-500/60 w-full"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
