import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminAgregarCaso() {
  const nav = useNavigate();

  const [form, setForm] = useState({
    // "caso" = número opcional. Si lo dejas vacío, el SP autogenera.
    caso: "",
    asunto: "",          // <-- Título obligatorio
    nivel: "",           // 1..3 (opcional)
    agente: "",          // id de usuario (opcional)
    inicio: "",          // dd/MM/aaaa (opcional)
    lob: "",             // opcional
    cierre: "",          // dd/MM/aaaa (opcional)
    descripcion: "",
    solucion: "",
    departamento: ""     // <-- NUEVO
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Validación mínima
    if (!form.asunto.trim()) {
      setError("El campo 'Asunto' es obligatorio.");
      return;
    }
    if (!form.departamento) {
      setError("Selecciona un Departamento.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/casos/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caso: form.caso,
          asunto: form.asunto,
          nivel: form.nivel || null,
          agente: form.agente || null,
          inicio: form.inicio,
          lob: form.lob,
          cierre: form.cierre,
          descripcion: form.descripcion,
          solucion: form.solucion,
          // Enviar SIEMPRE el departamento (en mayúsculas)
          departamento: (form.departamento || "").toUpperCase()
        })
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo crear el caso");
      }

      // Navega al detalle del caso recién creado
      nav(`/admin/casos/${data.id_caso}`);
    } catch (err) {
      setError(err.message || "Error al enviar el formulario");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-blue-900">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <header className="flex items-center justify-between">
          <h1 className="text-4xl font-extrabold text-white">AGREGAR CASOS</h1>
          <button
            onClick={() => nav(-1)}
            className="px-4 py-2 rounded-full bg-red-500 text-white font-bold hover:bg-red-600"
          >
            Regresar
          </button>
        </header>

        <section className="mt-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-600/20 border border-red-400 text-red-200 px-4 py-3">
                {error}
              </div>
            )}

            {/* Fila 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-semibold text-white">Caso (opcional)</label>
                <input
                  name="caso"
                  value={form.caso}
                  onChange={handleChange}
                  placeholder="WEB-YYYYMMDD-0001 o vacío para autogenerar"
                  className="w-full rounded-full px-4 py-2 bg-gray-200 text-black placeholder-gray-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-white">Nivel (1-3)</label>
                <input
                  name="nivel"
                  value={form.nivel}
                  onChange={handleChange}
                  placeholder="1, 2 o 3"
                  className="w-full rounded-full px-4 py-2 bg-gray-200 text-black placeholder-gray-600"
                />
              </div>
            </div>

            {/* Fila 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-semibold text-white">Agente (ID opcional)</label>
                <input
                  name="agente"
                  value={form.agente}
                  onChange={handleChange}
                  placeholder="ID de usuario (opcional)"
                  className="w-full rounded-full px-4 py-2 bg-gray-200 text-black placeholder-gray-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-white">LOB</label>
                <input
                  name="lob"
                  value={form.lob}
                  onChange={handleChange}
                  placeholder="Línea de negocio (opcional)"
                  className="w-full rounded-full px-4 py-2 bg-gray-200 text-black placeholder-gray-600"
                />
              </div>
            </div>

            {/* Fila 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-semibold text-white">Inicio</label>
                <input
                  name="inicio"
                  value={form.inicio}
                  onChange={handleChange}
                  placeholder="dd/mm/aaaa"
                  className="w-full rounded-full px-4 py-2 bg-gray-200 text-black placeholder-gray-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-white">Cierre</label>
                <input
                  name="cierre"
                  value={form.cierre}
                  onChange={handleChange}
                  placeholder="dd/mm/aaaa"
                  className="w-full rounded-full px-4 py-2 bg-gray-200 text-black placeholder-gray-600"
                />
              </div>
            </div>

            {/* Departamento (NUEVO) */}
            <div>
              <label className="block font-semibold text-white">Departamento</label>
              <select
                name="departamento"
                value={form.departamento}
                onChange={handleChange}
                className="w-full rounded-full px-4 py-2 bg-gray-200 text-black"
                required
              >
                <option value="">Selecciona…</option>
                <option value="NET">NET</option>
                <option value="SYS">SYS</option>
                <option value="PC">PC</option>
                <option value="HW">HW</option>
              </select>
            </div>

            {/* Asunto */}
            <div>
              <label className="block font-semibold text-white">Asunto (obligatorio)</label>
              <input
                name="asunto"
                value={form.asunto}
                onChange={handleChange}
                placeholder="Título del caso"
                className="w-full rounded-full px-4 py-2 bg-gray-200 text-black placeholder-gray-600"
                required
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block font-semibold text-white">Descripción</label>
              <textarea
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                rows={5}
                className="w-full rounded-2xl px-4 py-3 bg-gray-200 text-black"
              />
            </div>

            {/* Solución (opcional) */}
            <div>
              <label className="block font-semibold text-white">Solución (opcional)</label>
              <textarea
                name="solucion"
                value={form.solucion}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-2xl px-4 py-3 bg-gray-200 text-black"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="mt-2 mx-auto w-40 h-11 rounded-xl font-extrabold text-white bg-cyan-400 hover:bg-cyan-500 transition disabled:opacity-60"
            >
              {busy ? "Enviando..." : "Enviar"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
