// app/src/pages/AdminSugerencias.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminSugerencias() {
  const nav = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Filtros simples
  const [term, setTerm] = useState("");
  const [top, setTop] = useState(50);

  async function load() {
    try {
      setLoading(true);
      setErr("");

      const params = new URLSearchParams();
      params.set("top", String(top || 50));
      if (term.trim()) params.set("term", term.trim());

      const res = await fetch(`/api/sugerencias?${params.toString()}`);
      const txt = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status} - ${txt}`);

      const data = txt ? JSON.parse(txt) : [];
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr("No se pudo cargar la lista de sugerencias");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <main className="min-h-screen w-full relative overflow-hidden">
      {/* fondo + partículas */}
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
      <div className="absolute inset-0 -z-[9] bg-black/40" />
      <style>{`@keyframes float{0%{transform:translateY(0)}50%{transform:translateY(-10px)}100%{transform:translateY(0)}}`}</style>

      <div className="min-h-screen grid place-items-center p-6">
        {/* tarjeta estilo vidrio */}
        <section className="w-full max-w-5xl rounded-2xl border border-white/20 p-10 md:p-14 bg-white/10 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,.55)]">
          {/* header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold uppercase text-white">
              Lista de sugerencias
            </h1>
            <div className="flex gap-2">
              <button
                onClick={load}
                className="px-5 py-2 rounded-full bg-sky-500/90 hover:bg-sky-600 text-white font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                Actualizar
              </button>
              <button
                onClick={() => nav("/admin")}
                className="px-5 py-2 rounded-full bg-red-500/90 hover:bg-red-600 text-white font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                Regresar
              </button>
            </div>
          </div>

          {/* filtros */}
          <div className="flex flex-wrap items-end gap-3 mb-6">
            <div className="flex flex-col">
              <label className="text-sm text-white/80 mb-1">Buscar</label>
              <input
                className="rounded-full bg-white text-slate-900 px-4 py-2 outline-none shadow-inner shadow-black/10"
                placeholder="Número de caso"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-white/80 mb-1">TOP</label>
              <input
                type="number"
                min={1}
                max={200}
                className="rounded-full bg-white text-slate-900 px-4 py-2 outline-none w-28"
                value={top}
                onChange={(e) => setTop(Number(e.target.value || 50))}
              />
            </div>
            <button
              onClick={load}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
            >
              Buscar
            </button>
            <button
              onClick={() => { setTerm(""); setTop(50); load(); }}
              className="px-5 py-2 rounded-xl bg-slate-500/70 hover:bg-slate-600 text-white font-semibold"
            >
              Limpiar
            </button>
          </div>

          {/* tabla */}
<div className="rounded-2xl bg-gray-100 p-6 md:p-8 text-black">
  <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_1fr] items-center px-2 md:px-4 pb-3 font-bold text-gray-800">
    <span>Casos</span>
    <span className="text-right md:text-left">Agente:</span>
  </div>

  {loading && <div className="py-6 px-4">Cargando…</div>}
  {err && <div className="py-6 px-4 text-rose-600">{err}</div>}

  {!loading && !err && (
    <ul className="divide-y divide-gray-300">
      {items.map((it) => {
        const displayAgent =
          (it.agenteNombre && it.agenteNombre.trim()) ? it.agenteNombre
          : (it.agenteEmail && it.agenteEmail.trim()) ? it.agenteEmail
          : `ID ${it.agenteId}`;

        return (
          <li
            key={it.id}
            className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_1fr] items-center py-5 px-2 md:px-4"
          >
            <span className="text-lg md:text-xl font-normal font-mono tracking-widest">
              {it.numeroCaso}
            </span>
            <span className="text-lg md:text-xl font-medium md:text-left text-right">
              {displayAgent}
            </span>
          </li>
        );
      })}
      {items.length === 0 && (
        <li className="py-6 px-4 text-slate-600">Sin resultados</li>
      )}
    </ul>
  )}
</div>

        </section>
      </div>
    </main>
  );
}
