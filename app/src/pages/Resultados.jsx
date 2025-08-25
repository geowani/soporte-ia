import { useNavigate } from "react-router-dom";
import { CASES } from "../data/cases";

export default function Resultados() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen text-white relative">
      {/* Tu fondo */}
      <div
        className="absolute inset-0 -z-20"
        style={{
          backgroundImage: "url('/fondo.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Contenedor gris */}
      <section className="mx-4 md:mx-8 mt-6 bg-gray-200/90 text-black rounded-2xl p-4 md:p-6">
        <h2 className="font-bold text-lg md:text-xl mb-4">Resultados:</h2>

        <ul className="divide-y divide-gray-400">
          {CASES.map((c) => (
            <li key={c.id} className="py-4">
              <div className="flex items-start justify-between gap-4">
                <button
                  onClick={() => navigate(`/dashboard/${c.id}`)}
                  className="text-blue-600 hover:underline text-left"
                >
                  <div className="font-bold">Caso: {c.id}</div>
                  <div>Descripción: {c.titulo}.</div>
                </button>
                <span className="text-blue-600 font-semibold shrink-0">{c.area}</span>
              </div>

              <div className="mt-3 h-px bg-gray-500" />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
