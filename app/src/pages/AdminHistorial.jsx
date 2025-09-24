// app/src/pages/AdminHistorial.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminHistorial() {
  const nav = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // filtros UI
  const [q, setQ] = useState("");
  const [from, setFrom] = useState(""); // yyyy-mm-dd
  const [to, setTo] = useState("");     // yyyy-mm-dd
  const [limit, setLimit] = useState(50);

  // control de búsqueda
  const [hasSearched, setHasSearched] = useState(false);

  // helper para sumar días (uso en el filtrado)
  function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  // --- helper: fecha efectiva para filtrar (fecha en que se agregó al sistema) ---
  function getAddedDate(r) {
    // Prioridad: creado_en -> (fallback) fecha_creacion
    const raw =
      r?.creado_en ??
      r?.creadoEn ??
      r?.created_at ??
      r?.createdAt ??
      r?.fecha_creacion ??
      null;

    if (!raw) return null;

    // Normaliza "YYYY-MM-DD HH:mm:ss.sss" a ISO "YYYY-MM-DDTHH:mm:ss.sss"
    const asStr = String(raw);
    const normalized = asStr.includes("T") ? asStr : asStr.replace(" ", "T");
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // fetch (solo cuando el usuario hace clic en Buscar)
  async function loadCases() {
    // Permitir buscar si hay TEXTO o si hay AMBAS fechas
    if (!q && (!from || !to)) {
      setHasSearched(false);
      setErr("Escribe texto o completa ambas fechas para buscar.");
      return;
    }
    try {
      setLoading(true);
      setErr("");
      const lim = Math.min(Math.max(parseInt(limit || "1", 10), 1), 500); // rango 1..500
      const resp = await fetch(`/api/casos/ultimos?limit=${lim}`, { credentials: "include" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();

      const items = Array.isArray(json.items) ? json.items : [];

      // Ordena por fecha de agregado (desc), con fallback a fecha_creacion
      items.sort((a, b) => {
        const da = getAddedDate(a)?.getTime() ?? 0;
        const db = getAddedDate(b)?.getTime() ?? 0;
        return db - da;
      });

      setRows(items);
    } catch (e) {
      console.error("AdminHistorial fetch error:", e);
      setErr("No se pudieron cargar los últimos casos.");
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  }

  // Filtrado en memoria (por texto + rango de FECHA DE AGREGADO)
  const filtered = useMemo(() => {
    // Convertimos from/to a límites locales de día completo
    let fromDate = from ? new Date(from + "T00:00:00") : null;
    let toDate   = to   ? new Date(to   + "T00:00:00") : null;

    // Si el usuario invirtió el rango, lo corregimos
    if (fromDate && toDate && fromDate > toDate) {
      const tmp = fromDate;
      fromDate = toDate;
      toDate = tmp;
    }

    // toExclusive = (hasta + 1 día) 00:00 para comparación estricta "<"
    const toExclusive = toDate ? addDays(toDate, 1) : null;

    return (rows || []).filter(r => {
      const t = (r?.titulo_pref || "").toLowerCase();
      const n = String(r?.numero_caso || "").toLowerCase();
      const who = (r?.creado_por || "").toLowerCase();
      const okText =
        !q ||
        t.includes(q.toLowerCase()) ||
        n.includes(q.toLowerCase()) ||
        who.includes(q.toLowerCase());

      const d = getAddedDate(r);
      const okFrom = !fromDate || (d && d >= fromDate);
      const okTo   = !toExclusive || (d && d <  toExclusive); // ← fin exclusivo

      return okText && okFrom && okTo;
    });
  }, [rows, q, from, to]);

  return (
    <main className="min-h-screen w-full relative overflow-hidden text-white">
      {/* Fondo como tu diseño original */}
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

          {/* Card */}
          <div className="rounded-xl bg-gray-200 text-black p-6 md:p-8">
            {/* Controles */}
            <div className="grid gap-3 md:grid-cols-[1.2fr_.6fr_.6fr_.4fr_auto] mb-5">
              <input
                className="rounded-lg px-3 py-2 border border-gray-300"
                placeholder="Buscar (caso, título o usuario)"
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") loadCases(); }} // atajo Enter
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
              <input
                type="number"
                min={1}
                max={500}
                className="rounded-lg px-3 py-2 border border-gray-300"
                value={limit}
                onChange={e => setLimit(e.target.value)}
                placeholder="Resultados"
                title="Resultados máximos a mostrar"
              />
              <div className="flex gap-2">
                <button
                  onClick={loadCases}
                  className="rounded-lg px-3 py-2 bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  // Permite buscar si hay texto o si hay ambas fechas
                  disabled={loading || (!q && (!from || !to))}
                  title={!q && (!from || !to) ? "Escribe texto o completa ambas fechas" : "Buscar"}
                >
                  {loading ? "Buscando…" : "Buscar"}
                </button>
                <button
                  onClick={() => {
                    setQ(""); setFrom(""); setTo(""); setRows([]);
                    setHasSearched(false); setErr("");
                  }}
                  className="rounded-lg px-3 py-2 bg-gray-800 text-white"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>

            {/* Header tabla */}
            <div className="grid grid-cols-[1fr_2fr_1fr] font-semibold text-gray-700 border-b border-gray-300 pb-4 mb-4">
              <span>Casos</span>
              <span>Título</span>
              <span>Agregado por</span>
            </div>

            {/* Estados */}
            {err && <div className="py-6 text-red-600">{err}</div>}
            {!hasSearched && !loading && !err && (
              <div className="py-6 text-gray-600">
                Ingresa <b>texto</b> o <b>fecha desde</b> y <b>fecha hasta</b> (día en que se
                <b> agregaron</b>), define <b>Resultados</b> y presiona <b>Buscar</b>.
              </div>
            )}

            {/* Lista */}
            {hasSearched && !loading && !err && (
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
