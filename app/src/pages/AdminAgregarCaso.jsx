import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminAgregarCaso() {
  const nav = useNavigate();

  const [form, setForm] = useState({
    caso: "",
    nivel: "",
    agente: "",
    inicio: "",
    lob: "",
    cierre: "",
    descripcion: "",
    solucion: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Formulario enviado:", form);
    alert("Caso agregado (mock). Revisa la consola.");
    nav("/admin");
  };

  return (
    <main className="min-h-screen w-full relative overflow-hidden text-white">
      {/* Fondo */}
      <div
        className="absolute inset-0 -z-20"
        style={{
          backgroundImage: "url('/fondo.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
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
          animation: "float 12s linear infinite"
        }}
      />
      <style>{`@keyframes float { 0%{transform:translateY(0)} 50%{transform:translateY(-10px)} 100%{transform:translateY(0)} }`}</style>

      {/* Contenedor */}
      <div className="min-h-screen grid place-items-center p-6">
        <section className="w-full max-w-5xl rounded-2xl border border-white/20 p-10 md:p-14 shadow-[0_20px_60px_rgba(0,0,0,.45)] bg-white/10 backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold uppercase text-white">
              Agregar Casos
            </h1>
            <button
              onClick={() => nav("/admin")}
              className="absolute right-6 top-6 px-5 py-2 rounded-full bg-red-500/90 hover:bg-red-600 font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              Regresar
            </button>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Fila 1 */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block font-semibold text-white">Caso</label>
                <input
                  name="caso"
                  value={form.caso}
                  onChange={handleChange}
                  className="w-full rounded-full px-4 py-2 bg-gray-200 text-black placeholder-gray-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-white">Nivel</label>
                <input
                  name="nivel"
                  value={form.nivel}
                  onChange={handleChange}
                  className="w-full rounded-full px-4 py-2 bg-gray-200 text-black placeholder-gray-600"
                />
              </div>
            </div>

            {/* Fila 2 */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block font-semibold text-white">Agente</label>
                <input
                  name="agente"
                  value={form.agente}
                  onChange={handleChange}
                  className="w-full rounded-full px-4 py-2 bg-gray-200 text-black placeholder-gray-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-white">Inicio</label>
                <input
                  type="date"
                  name="inicio"
                  value={form.inicio}
                  onChange={handleChange}
                  className="w-full rounded-full px-4 py-2 bg-gray-200 text-black"
                />
              </div>
            </div>

            {/* Fila 3 */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block font-semibold text-white">LOB</label>
                <input
                  name="lob"
                  value={form.lob}
                  onChange={handleChange}
                  className="w-full rounded-full px-4 py-2 bg-gray-200 text-black placeholder-gray-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-white">Cierre</label>
                <input
                  type="date"
                  name="cierre"
                  value={form.cierre}
                  onChange={handleChange}
                  className="w-full rounded-full px-4 py-2 bg-gray-200 text-black"
                />
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block font-semibold text-white">Descripción</label>
              <textarea
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                rows="3"
                className="w-full rounded-lg px-4 py-2 bg-gray-200 text-black placeholder-gray-600"
              />
            </div>

            {/* Solución */}
            <div>
              <label className="block font-semibold text-white">Solución</label>
              <textarea
                name="solucion"
                value={form.solucion}
                onChange={handleChange}
                rows="3"
                className="w-full rounded-lg px-4 py-2 bg-gray-200 text-black placeholder-gray-600"
              />
            </div>

            {/* Botón enviar */}
            <button
              type="submit"
              className="mt-4 mx-auto w-40 h-11 rounded-xl font-extrabold text-white bg-cyan-400 hover:bg-cyan-500 transition"
            >
              Enviar
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
