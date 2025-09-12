import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

/** Formateo seguro: acepta ISO o Date y muestra fecha/hora local */
function fmt(fecha) {
  if (!fecha) return "—";
  try {
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(d.getTime())) return String(fecha);
    return d.toLocaleString();
  } catch {
    return String(fecha);
  }
}

/** Normaliza un row a la forma que pinta la UI */
function normalize(row) {
  if (!row) return null;
  const id =
    row.id_caso ?? row.id ?? row.Id ?? row.numero_caso ?? row.codigo ?? null;

  return {
    id,
    numero: row.numero_caso ?? row.codigo ?? null,
    asunto: row.asunto ?? row.titulo ?? "",
    inicio: row.inicio ?? row.fecha_creacion ?? null,   // detalle o búsqueda
    cierre: row.cierre ?? row.fecha_cierre ?? null,
    descripcion: row.descripcion ?? "",
    solucion: row.solucion ?? "",
    resueltoPor: row.resuelto_por ?? row.resueltoPor ?? "—",
    departamento: row.departamento ?? row.sistema ?? row.sistema_det ?? "—",
    nivel: row.nivel ?? "—",
  };
}

export default function CasoDetalle() {
  const { id } = useParams(); // /caso/:id  (puede ser id_caso o numero_caso)
  const navigate = useNavigate();
  const location = useLocation();

  const fromQ = location.state?.fromQ || "";
  const rowFromNav = location.state?.row || null;

  // 🔎 estado de búsqueda dentro del detalle
  const [q, setQ] = useState(fromQ);

  // Semilla visual con lo que venga de navegación (puede estar incompleto)
  const [caso, setCaso] = useState(() => normalize(rowFromNav));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => setQ(fromQ), [fromQ]);

  const doSearch = () => {
    const term = (q || "").trim();
    if (!term) return;
    navigate(`/resultados?q=${encodeURIComponent(term)}`);
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

  // 🚀 SIEMPRE pedir el detalle (aunque ya tengamos 'caso' preliminar),
  // y fusionar para completar campos faltantes (inicio/cierre/solución/resuelto_por/nivel).
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        // 1) Endpoint de detalle que mapea a sp_caso_detalle
        const r = await fetch(`/api/casos/detalle/${encodeURIComponent(String(id))}`);
        if (!r.ok) throw new Error("HTTP " + r.status);
        const data = await r.json(); // { id, codigo, titulo, descripcion, departamento, nivel, inicio, cierre, solucion, resuelto_por }
        const det = normalize(data);

        if (alive) {
          setCaso((prev) => {
            // fusionamos: lo del detalle pisa a lo del preliminar si trae datos
            const base = prev || {};
            return {
              ...base,
              ...Object.fromEntries(
                Object.entries(det).filter(([, v]) => v !== undefined && v !== null && v !== "")
              ),
            };
          });
        }
      } catch (e) {
        // 2) Fallback: buscar y empatar
        try {
          const r2 = await fetch(`/api/casos-search?q=${encodeURIComponent(String(id))}`);
          if (!r2.ok) throw new Error("HTTP " + r2.status);
          const data2 = await r2.json();
          const items = Array.isArray(data2) ? data2 : data2.items || [];
          const match =
            items.find((x) => String(x.id_caso ?? x.id) === String(id)) ||
            items.find((x) => String(x.numero_caso ?? x.codigo) === String(id)) ||
            null;

          if (alive) setCaso(normalize(match));
        } catch (e2) {
          if (alive) setErr(e2.message || "No se pudo cargar el detalle");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

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
          className="px-5 py-2 rounded-full bg-red-500/90 hover:bg-red-600 text-white font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-white/50"
        >
          REGRESAR
        </button>
      </div>

      {/* 🔎 Buscador centrado */}
      <div className="mt-4 px-4 w-full flex justify-center">
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
      </div>

      {/* Tarjeta centrada */}
      <div className="mt-5 px-4 pb-8">
        <div className="w-full max-w-5xl mx-auto rounded-2xl bg-slate-200/90 text-slate-900 p-6 md:p-8 border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,.35)]">
          {loading && <div className="text-slate-700">Cargando…</div>}
          {err && <div className="text-red-700">Error: {err}</div>}

          {!caso ? (
            <div className="text-slate-800">No se encontró el caso <b>{id}</b>.</div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="flex flex-col">
                  <div className="font-bold text-xl text-black">Caso: {caso.numero || caso.id}</div>
                  <div className="font-bold text-base mt-6">{caso.asunto?.trim() || "—"}</div>
                </div>
                <div className="text-right">
                  <div><span className="font-bold">Inicio:</span> {fmt(caso.inicio)}</div>
                  <div><span className="font-bold">Cierre:</span> {fmt(caso.cierre)}</div>
                </div>
              </div>

              <div className="mt-6 font-bold">Descripción:</div>
              <p className="mt-1 leading-relaxed">{caso.descripcion || "—"}</p>

              <div className="mt-6 font-bold">Solución:</div>
              <p className="mt-1 leading-relaxed">{caso.solucion || "—"}</p>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="font-bold">Resuelto por:</div>
                  <div>{caso.resueltoPor || "—"}</div>
                </div>
                <div>
                  <div className="font-bold">Departamento:</div>
                  <div>{caso.departamento || "—"}</div>
                </div>
                <div>
                  <div className="font-bold">Nivel:</div>
                  <div>{caso.nivel ?? "—"}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
