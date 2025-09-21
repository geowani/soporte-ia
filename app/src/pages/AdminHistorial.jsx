// app/src/pages/AdminHistorial.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminHistorial() {
  const nav = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const resp = await fetch(`/api/casos/ultimos?limit=50`, { credentials: "include" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        if (!alive) return;
        setRows(Array.isArray(json.items) ? json.items : []);
      } catch (e) {
        if (!alive) return;
        console.error("AdminHistorial fetch error:", e);
        setErr("No se pudieron cargar los últimos casos.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    return (rows || []).filter(r => {
      const t = (r?.titulo_pref || "").toLowerCase();
      const n = String(r?.numero_caso || "").toLowerCase();
      const who = (r?.creado_por || "").toLowerCase();
      const okText = !q || t.includes(q.toLowerCase()) || n.includes(q.toLowerCase()) || who.includes(q.toLowerCase());

      const d = r?.fecha_creacion ? new Date(r.fecha_creacion) : null;
      const okFrom = !from || (d && d >= new Date(from + "T00:00:00"));
      const okTo   = !to   || (d && d <= new Date(to   + "T23:59:59"));
      return okText && okFrom && okTo;
    });
  }, [rows, q, from, to]);

  return (
    <main className="min-h-screen w-full relative overflow-hidden text-white">
      {/* 👇 Fondo igual al diseño original */}
      <div
        className="absolute inset-0 -z-20"
        style={{
          backgroundImage: "url('/fondo.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
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
              className="px-5 py-2 rounded-full bg-red-500/90 hover:bg-red-600 text-white font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              Regresar
            </button>
          </div>

          {/* Card tabla con filtros */}
          <div className="rounded-xl bg-gray-200 text-black p-6 md:p-8">
            {/* Barra de filtros */}
            <div className="grid gap-3 md:grid-cols-[1.2fr_.6fr_.6fr_auto] mb-5">
              <input
                className="rounded-lg px-3 py-2 border border-gray-300"
                placeholder="Buscar (caso, título o usuario)"
                value={q}
                onChange={e => setQ(e.target.value)}
              />
              <input
                type="date"
                className="rounded-lg px-3 py-2 border border-gray-300"
                value={from}
                onChange={e => setFrom(e.target.value)}
              />
              <input
                type="date"
                className="rounded-lg px-3 py-2 border border-gray-300"
                value={to}
                onChange={e => setTo(e.target.value)}
              />
              <button
                onClick={() => { setQ(""); setFrom(""); setTo(""); }}
                className="rounded-lg px-3 py-2 bg-gray-800 text-white"
              >
                Limpiar filtros
              </button>
            </div>

            {/* Header tabla */}
            <div className="grid grid-cols-[1fr_2fr_1fr] font-semibold text-gray-700 border-b border-gray-300 pb-4 mb-4">
              <span>Casos</span>
              <span>Título</span>
              <span>Agregado por</span>
            </div>

            {/* Estados */}
            {loading && <div className="py-6 text-gray-600">Cargando…</div>}
            {!loading && err && <div className="py-6 text-red-600">{err}</div>}

            {/* Lista */}
            {!loading && !err && (
              <>
                <ul className="divide-y divide-gray-300">
                  {filtered.map((r, i) => (
                    <li
                      key={`${r.numero_caso}-${i}`}
                      className="grid grid-cols-[1fr_2fr_1fr] items-center py-4 px-2 md:px-4"
                    >
                      <span>{r.numero_caso}</span>
                      <span>{r.titulo_pref}</span>
                      <span>{r.creado_por || "(sin asignar)"}</span>
                    </li>
                  ))}
                </ul>
                {filtered.length === 0 && (
                  <div className="py-6 text-gray-600">Sin resultados con los filtros aplicados.</div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
