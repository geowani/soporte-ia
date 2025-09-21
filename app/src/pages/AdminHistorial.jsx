import { useEffect, useMemo, useState } from "react";
// ...

export default function AdminHistorial() {
  // ...
  const [q, setQ] = useState("");
  const [from, setFrom] = useState(""); // yyyy-mm-dd
  const [to, setTo] = useState("");     // yyyy-mm-dd

  // ... fetch igual que ahora (limit=50 por ejemplo)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true); setErr("");
        const resp = await fetch(`/api/casos/ultimos?limit=50`, { credentials: "include" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        if (!alive) return;
        setRows(Array.isArray(json.items) ? json.items : []);
      } catch {
        if (!alive) return;
        setErr("No se pudieron cargar los últimos casos.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Filtrado en memoria
  const filtered = useMemo(() => {
    return rows.filter(r => {
      const t = (r.titulo_pref || "").toLowerCase();
      const n = String(r.numero_caso || "").toLowerCase();
      const who = (r.creado_por || "").toLowerCase();
      const okText = !q || t.includes(q.toLowerCase()) || n.includes(q.toLowerCase()) || who.includes(q.toLowerCase());

      const d = r.fecha_creacion ? new Date(r.fecha_creacion) : null;
      const okFrom = !from || (d && d >= new Date(from + "T00:00:00"));
      const okTo   = !to   || (d && d <= new Date(to   + "T23:59:59"));
      return okText && okFrom && okTo;
    });
  }, [rows, q, from, to]);

  return (
    <main className="min-h-screen w-full relative overflow-hidden text-white">
      {/* ... header igual ... */}

      <div className="rounded-xl bg-gray-200 text-black p-6 md:p-8">
        {/* Controles de búsqueda */}
        <div className="grid gap-3 md:grid-cols-4 mb-5">
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
        <div className="grid grid-cols-[1fr_2fr_1fr] font-semibold text-gray-700 border-b border-gray-300 pb-4 mb-1">
          <span>Casos</span><span>Título</span><span>Agregado por</span>
        </div>

        {/* Lista */}
        <ul className="divide-y divide-gray-300">
          {filtered.map((r, idx) => (
            <li key={`${r.numero_caso}-${idx}`} className="grid grid-cols-[1fr_2fr_1fr] items-center py-4 px-2 md:px-4">
              <span>{r.numero_caso}</span>
              <span>{r.titulo_pref}</span>
              <span>{r.creado_por || "(sin asignar)"}</span>
            </li>
          ))}
        </ul>

        {!loading && !err && filtered.length === 0 && (
          <div className="py-6 text-gray-600">Sin resultados con los filtros aplicados.</div>
        )}
      </div>
    </main>
  );
}
