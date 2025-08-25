// src/pages/CaseDashboard.jsx
import { useParams, useNavigate, Link } from "react-router-dom";
import { getCaseById, CASES } from "../data/cases";
import { useMemo, useState } from "react";

const Badge = ({ children }) => (
  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
    {children}
  </span>
);

export default function CaseDashboard() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const data = useMemo(() => getCaseById(caseId), [caseId]);
  const [tab, setTab] = useState("overview");
  const [resuelto, setResuelto] = useState(false);

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl mb-4">Caso no encontrado</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-blue-600 rounded-lg">
            Regresar
          </button>
        </div>
      </main>
    );
  }

  const relacionados = CASES.filter(c => data.relacionados.includes(c.id));

  const copiarSolucion = async () => {
    await navigator.clipboard.writeText(data.solucionSugerida || "");
    alert("Solución copiada al portapapeles.");
  };

  return (
    <main className="min-h-screen w-full text-white relative">
      <div
        className="absolute inset-0 -z-10 opacity-20"
        style={{
          backgroundImage: "url('/fondo.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-8 py-4">
        <button onClick={() => navigate(-1)} className="font-bold tracking-wide hover:opacity-80">
          REGRESAR
        </button>
        <h1 className="text-xl md:text-2xl font-extrabold">BASE DE CASOS — Dashboard</h1>
        <div className="w-[88px]" />
      </header>

      {/* Card principal */}
      <section className="px-4 md:px-8 pb-12">
        <div className="bg-gray-200/95 text-black rounded-2xl p-5 md:p-8 shadow-lg">
          {/* Encabezado del caso */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-blue-700">
                Caso: {data.id} — {data.titulo}
              </h2>
              <p className="text-gray-700">{data.descripcion}</p>
            </div>
            <div className="flex gap-2 items-center">
              <Badge>{data.area}</Badge>
              <Badge>Prioridad: {data.prioridad}</Badge>
              <Badge>Estado: {resuelto ? "Cerrado" : data.estado}</Badge>
            </div>
          </div>

          {/* Metadatos */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
            <div><span className="font-semibold">Creado:</span> {data.creadoEl}</div>
            <div><span className="font-semibold">Actualizado:</span> {data.actualizadoEl}</div>
            <div className="flex gap-2 items-center flex-wrap">
              <span className="font-semibold">Tags:</span>
              {data.tags?.map(t => <Badge key={t}>{t}</Badge>)}
            </div>
          </div>

          {/* Acciones */}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => setResuelto(true)}
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
              disabled={resuelto}
            >
              {resuelto ? "Marcado como resuelto" : "Marcar como resuelto"}
            </button>
            <button
              onClick={copiarSolucion}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Copiar solución sugerida
            </button>
          </div>

          {/* Tabs simples */}
          <div className="mt-6 border-b border-gray-300 flex gap-4">
            {[
              { id: "overview", label: "Resumen" },
              { id: "checklist", label: "Checklist" },
              { id: "relacionados", label: "Relacionados" },
              { id: "notas", label: "Notas" },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`pb-2 -mb-px border-b-2 ${tab === t.id ? "border-blue-600 text-blue-700 font-semibold" : "border-transparent text-gray-600"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Contenido de tabs */}
          <div className="mt-4">
            {tab === "overview" && (
              <div className="space-y-2">
                <p className="text-gray-800">
                  <span className="font-semibold">Solución sugerida:</span> {data.solucionSugerida}
                </p>
              </div>
            )}

            {tab === "checklist" && (
              <ol className="list-decimal pl-6 space-y-2 text-gray-800">
                {data.pasos?.map((p, i) => <li key={i}>{p}</li>)}
              </ol>
            )}

            {tab === "relacionados" && (
              <ul className="space-y-2">
                {relacionados.length === 0 && <li className="text-gray-700">No hay casos relacionados.</li>}
                {relacionados.map(r => (
                  <li key={r.id}>
                    <Link to={`/dashboard/${r.id}`} className="text-blue-600 hover:underline">
                      {r.id} — {r.titulo}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {tab === "notas" && (
              <div className="space-y-2">
                <textarea
                  placeholder="Escribe notas internas (solo local, sin guardar en BD)…"
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-600">*Esto no se guarda (demo sin base de datos).</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
