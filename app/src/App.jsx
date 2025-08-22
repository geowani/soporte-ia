import { useEffect, useState } from "react";
import { ping, listarCasos } from "./api";

export default function App() {
  const [ok, setOk] = useState(false);
  const [casos, setCasos] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    ping().then(()=>setOk(true)).catch(e=>setError(e.message));
  }, []);

  const cargar = async () => {
    setError("");
    try { setCasos(await listarCasos()); } catch(e){ setError(e.message); }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Soporte IA – Demo</h1>
        <span className={`px-2 py-1 rounded ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          Backend: {ok ? 'OK' : 'NO responde'}
        </span>

        <div className="mt-4">
          <button onClick={cargar} className="px-4 py-2 rounded bg-black text-white">
            Cargar casos
          </button>
        </div>

        {error && <p className="mt-3 text-red-600">Error: {error}</p>}
        <ul className="mt-4 space-y-2">
          {casos.map((c, i) => (
            <li key={c.id ?? c.IdCaso ?? i} className="p-3 bg-white rounded border">
              <div className="font-medium">{c.titulo ?? c.Titulo ?? '(sin título)'}</div>
              <div className="text-sm text-gray-600">Estado: {c.estado ?? c.Estado ?? '-'}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
