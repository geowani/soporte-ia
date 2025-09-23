// app/src/pages/AdminAgentes.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export default function AdminAgentes() {
  const nav = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [dias, setDias] = useState(30); // 7 | 30 | 90 | "" (histórico)

  const abortRef = useRef(null);

  async function loadData(diasParam) {
    // cancela llamada anterior si aún está en vuelo
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setErr(null);

      const url =
        diasParam !== "" && diasParam != null
          ? `${API_BASE}/agentes-busquedas?dias=${diasParam}`
          : `${API_BASE}/agentes-busquedas`;

      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status} (${url})`);
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      // ignora aborts, muestra otros errores
      if (e.name !== "AbortError") {
        setErr(e.message || "Error cargando datos");
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }

  // carga inicial
  useEffect(() => {
    loadData(dias);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // recargar cuando cambie el rango
  useEffect(() => {
    loadData(dias);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias]);

  return (
    <main className="min-h-screen w-full relative overflow-hidden">
      {/* Fondo */}
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

      <div className="min-h-screen grid place-items-center p-6">
        <section className="w-full max-w-5xl rounded-2xl border border-white/20 p-10 md:p-14 shadow-[0_20px_60px_rgba(0,0,0,.45)] bg-white/10 backdrop-blur-md text-black">
          {/* Encabezado */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold uppercase text-white">
              Agentes con más búsquedas
            </h1>

            <div className="flex items-center gap-3">
              <select
                value={dias}
                onChange={(e) => {
                  const v = e.target.value;
                  setDias(v === "" ? "" : Number(v));
                }}
                className="px-3 py-2 rounded-lg bg-white/90 text-gray-800"
                title="Rango de tiempo"
              >
                <option value={7}>7 días</option>
                <option value={30}>30 días</option>
                <option value={90}>90 días</option>
                <option value="">Histórico</option>
              </select>

              <button
                onClick={() => loadData(dias)}
                className="px-4 py-2 rounded-lg bg-blue-500/90 hover:bg-blue-600 text-white font-semibold shadow-md transition"
                title="Refrescar"
              >
                Refrescar
              </button>

              <button
                onClick={() => nav("/admin")}
                className="px-5 py-2 rounded-full bg-red-500/90 hover:bg-red-600 text-white font-semibold shadow-md transition"
              >
                Regresar
              </button>
            </div>
          </div>

          {/* Tabla */}
          <div className="rounded-xl bg-gray-100 p-6 md:p-8 text-black">
            {loading && <div className="py-6 text-center text-gray-600">Cargando…</div>}
            {err && !loading && (
              <div className="py-6 text-center text-red-600">Error: {err}</div>
            )}
            {!loading && !err && (
              <>
                <div className="grid grid-cols-[1fr_auto] items-center px-2 md:px-4 pb-3 font-bold text-gray-800">
                  <span>Agente:</span>
                  <span>Búsquedas realizadas:</span>
                </div>
                <ul className="divide-y divide-gray-400">
                  {items.length === 0 && (
                    <li className="py-6 px-2 md:px-4 text-gray-600">
                      Sin datos en el período seleccionado.
                    </li>
                  )}
                  {items.map((a) => (
                    <li
                      key={a.agente_id ?? a.agente_nombre}
                      className="grid grid-cols-[1fr_auto] items-center py-5 px-2 md:px-4"
                    >
                      <span className="text-lg md:text-xl font-normal">
                        {a.agente_nombre}
                      </span>
                      <span className="text-lg md:text-xl font-normal">
                        {a.busquedas_realizadas}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
