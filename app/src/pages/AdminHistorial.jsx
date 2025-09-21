// app/src/pages/AdminHistorial.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminHistorial() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const resp = await fetch(`/api/casos/ultimos?limit=5`, { credentials: "include" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        if (!alive) return;
        setRows(Array.isArray(json.items) ? json.items : []);
      } catch (e) {
        if (!alive) return;
        setErr("No se pudieron cargar los últimos casos.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <main className="min-h-screen w-full relative overflow-hidden text-white">
      {/* Fondo */}
      <div
        className="absolute inset-0 -z-20"
        style={{ backgroundImage: "url('/fondo.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}
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
          animation: "float 12s linear infinite",
        }}
      />
      <style>{`@keyframes float {0%{transform:translateY(0)}50%{transform:translateY(-10px)}100%{transform:translateY(0)}}`}</style>

      <div className="min-h-screen grid place-items-center p-6">
        <section className="w-full max-w-6xl rounded-2xl border border-white/20 p-10 md:p-14 shadow-[0_20px_60px_rgba(0,0,0,.45)] bg-white/10 backdrop-blur-md">
          {/* Encabezado */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold uppercase text-white">
              Lista de Últimos Casos Agregados
            </h1>
            <button
              onClick={() => nav("/admin")}
              className="px-5 py-2 rounded-full bg-red-500/90 hover:bg-red-500 transition focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              Regresar
            </button>
          </div>

          <div className="rounded-xl bg-gray-200 text-black p-6 md:p-8">
            {/* Header tabla */}
            <div className="grid grid-cols-[1fr_2fr_1fr] font-semibold text-gray-700 border-b border-gray-300 pb-4 mb-4">
              <span>Casos</span>
              <span>Título</span>
              <span>Agregado por</span>
            </div>

            {/* Estados */}
            {loading && <div className="py-6 text-gray-600">Cargando…</div>}
            {!loading && err && <div className="py-6 text-red-600">{err}</div>}
            {!loading && !err && rows.length === 0 && (
              <div className="py-6 text-gray-600">Sin datos para mostrar.</div>
            )}

            {/* Filas */}
            <ul className="divide-y divide-gray-300">
              {rows.map((r, idx) => (
                <li key={`${r.numero_caso}-${idx}`} className="grid grid-cols-[1fr_2fr_1fr] items-center py-4 px-2 md:px-4">
                  <span className="font-normal">{r.numero_caso}</span>
                  <span>{r.titulo_pref}</span>
                  <span>{r.creado_por || "(sin asignar)"}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
