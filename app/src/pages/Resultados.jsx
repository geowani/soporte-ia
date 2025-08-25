// app/src/pages/Resultados.jsx
import React, { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CASES } from "../data/cases.js";

export default function Resultados() {
  const navigate = useNavigate();
  const { search } = useLocation();

  // lee ?q= del URL (ej: /?q=1052505)
  const q = new URLSearchParams(search).get("q")?.trim().toLowerCase() || "";

  // filtra por id, título, descripción, área y tags
  const lista = useMemo(() => {
    if (!q) return CASES;
    return CASES.filter((c) =>
      c.id.includes(q) ||
      c.titulo.toLowerCase().includes(q) ||
      c.descripcion.toLowerCase().includes(q) ||
      c.area.toLowerCase().includes(q) ||
      (c.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }, [q]);

  return (
    <main className="min-h-screen text-white relative">
      {/* Fondo */}
      <div
        className="absolute inset-0 -z-20"
        style={{
          backgroundImage: `url('${import.meta.env.BASE_URL}fondo.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Contenedor gris */}
      <section className="mx-4 md:mx-8 mt-6 bg-gray-200/90 text-black rounded-2xl p-4 md:p-6 shadow-lg">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-bold text-lg md:text-xl">
            Resultados{q && <> para: <span className="text-blue-700 break-all">“{q}”</span></>}
          </h2>
          <span className="text-sm text-gray-600">{lista.length} resultado(s)</span>
        </div>

        {!lista.length && (
          <p className="mt-3 text-sm text-gray-600">
            Sin coincidencias. Prueba con otro término o vuelve al{" "}
            <button
              className="text-blue-600 underline"
              onClick={() => navigate("/")}
            >
              buscador
            </button>.
          </p>
        )}

        <ul className="mt-2 divide-y divide-gray-400">
          {lista.map((c) => (
            <li key={c.id} className="py-4">
              <div className="flex items-start justify-between gap-4">
                <button
                  onClick={() => navigate(`/dashboard/${c.id}`)}
                  className="text-blue-600 hover:underline text-left"
                  title="Abrir dashboard del caso"
                >
                  <div className="font-bold">Caso: {c.id}</div>
                  <div>Descripción: {c.titulo}.</div>
                </button>

                <span className="text-blue-600 font-semibold shrink-0">
                  {c.area}
                </span>
              </div>

              <div className="mt-3 h-px bg-gray-500" />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
