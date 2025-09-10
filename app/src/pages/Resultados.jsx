import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { buscarCasos } from "../api";

export default function Resultados() {
  const location = useLocation();
  const navigate = useNavigate();

  // Lee ?q= de la URL
  const urlQ = new URLSearchParams(location.search).get("q") || "";
  const [q, setQ] = useState(urlQ);

  // Datos de la API
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Mantén input sincronizado si cambia la URL
  useEffect(() => { setQ(urlQ); }, [urlQ]);

  // Ejecuta la búsqueda cada vez que cambie ?q=
  useEffect(() => {
    const term = urlQ.trim();
    if (!term) {
      setItems([]);
      setTotal(0);
      setError("");
      return;
    }

    let abort = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await buscarCasos({ q: term, page: 1, pageSize: 20 });
        if (!abort) {
          setItems(res.items || []);
          setTotal(res.total ?? (res.items?.length || 0));
        }
      } catch (e) {
        if (!abort) {
          setItems([]);
          setTotal(0);
          setError(e?.message || "Error al buscar casos");
        }
      } finally {
        if (!abort) setLoading(false);
      }
    })();

    return () => { abort = true; };
  }, [urlQ]);

  // Submit de búsqueda: actualiza la URL (recargable/compartible)
  const doSearch = () => {
    const term = q.trim();
    if (!term) return;
    navigate(`/resultados?q=${encodeURIComponent(term)}`, { replace: true });
  };

  // Mensajes derivados
  const emptyMessage = useMemo(() => {
    if (!q.trim()) return "Escribe un término para buscar.";
    if (loading) return "";
    if (error) return "";
    if ((items?.length || 0) === 0) return `Sin coincidencias para “${q}”.`;
    return "";
  }, [q, loading, error, items]);

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

      {/* Contenido */}
      <div className="mt-6 px-4 w-full flex flex-col items-center">
        {/* Buscador */}
        <div className="w-full max-w-3xl flex items-center rounded-full bg-white/85 text-slate-900 overflow-hidden shadow-inner shadow-black/10">
          <input
            className="flex-1 bg-transparent px-4 py-3 outline-none placeholder:text-slate-600"
            type="text"
            placeholder="Busca por título, id o síntoma"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                doSearch();
              }
            }}
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

        {/* Resultados */}
        <div className="mt-5 w-full max-w-4xl rounded-2xl bg-slate-200/85 text-slate-900 p-5 md:p-6 border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,.35)]">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-lg">Resultados:</div>
            {total > 0 && (
              <div className="text-sm text-slate-700">
                {total} coincidencia{total === 1 ? "" : "s"}
              </div>
            )}
          </div>

          {!!error && (
            <div className="text-red-700 bg-red-100/70 border border-red-300 rounded-md px-3 py-2 mb-3">
              {error}
            </div>
          )}

          {!!emptyMessage && (
            <div className="text-slate-700">{emptyMessage}</div>
          )}

          {loading && (
            <div className="text-slate-700 animate-pulse">Buscando…</div>
          )}

          {!loading && !error && items?.length > 0 && (
            <div className="max-h-[60vh] overflow-y-auto pr-2">
              {items.map((c, i) => {
                // Campos desde el SP: id_caso, numero_caso, asunto, descripcion, departamento
                const idCaso = c.id_caso ?? c.id ?? c.numero_caso ?? 0;
                const numero = c.numero_caso ?? "";
                const area = c.departamento ?? "";
                const asunto = c.asunto ?? "";
                const descripcion = c.descripcion ?? "";

                return (
                  <div key={`${idCaso}-${i}`} className="py-3">
                    <div className="flex items-start justify-between">
                      {/* Navega al detalle con el id del caso y pasa el row completo */}
                      <button
                        onClick={() =>
                          navigate(`/caso/${idCaso}`, { state: { fromQ: q, row: c } })
                        }
                        className="text-blue-600 font-bold hover:underline text-left"
                        title={asunto || "Ver detalle"}
                      >
                        Caso: {numero || idCaso}
                      </button>
                      <span className="text-blue-600 font-semibold">
                        {area || "—"}
                      </span>
                    </div>

                    <div className="text-slate-800 mt-1">
                      {asunto && <span className="font-semibold">{asunto}. </span>}
                      <span className="text-blue-600">
                        Descripción: {descripcion}
                      </span>
                    </div>

                    {i < items.length - 1 && (
                      <div className="mt-3 h-px bg-slate-500/60 w-full"></div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
