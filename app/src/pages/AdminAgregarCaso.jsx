import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminAgregarCaso() {
  const nav = useNavigate();

  const [form, setForm] = useState({
    caso: "",
    asunto: "",
    nivel: "",
    agente: "",
    inicio: "",       // ahora: solo dígitos (dd/mm/aaaa)
    cierre: "",       // ahora: solo dígitos (dd/mm/aaaa)
    descripcion: "",
    solucion: "",
    departamento: ""
  });

  const [usuarios, setUsuarios] = useState([]);
  const [usuariosLoading, setUsuariosLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Cargar agentes por nombre
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setUsuariosLoading(true);
        const r = await fetch(`/api/usuarios-list?t=${Date.now()}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (!cancelled) setUsuarios(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Fallo usuarios-list:", e);
        if (!cancelled) {
          setUsuarios([]);
          setError((prev) => prev || "No se pudo cargar la lista de agentes.");
        }
      } finally {
        if (!cancelled) setUsuariosLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // Solo dígitos para "caso"
  function handleCasoChange(e) {
    const soloDigitos = e.target.value.replace(/\D/g, "");
    setForm((prev) => ({ ...prev, caso: soloDigitos }));
  }

  // Solo dígitos para "inicio" y "cierre" (máx 8 -> ddmmaaaa)
  function handleFechaDigits(name, e) {
    const soloDigitos = e.target.value.replace(/\D/g, "").slice(0, 8);
    setForm((prev) => ({ ...prev, [name]: soloDigitos }));
  }

  const toDDMMYYYY = (digits) =>
    digits && digits.length === 8
      ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
      : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Validaciones
    if (form.caso && !/^\d+$/.test(form.caso)) {
      setError("El número de caso solo puede contener dígitos.");
      return;
    }
    if (!form.asunto.trim()) {
      setError("El campo 'Asunto' es obligatorio.");
      return;
    }
    if (!form.departamento) {
      setError("Selecciona un Departamento.");
      return;
    }
    if (form.inicio && form.inicio.length !== 8) {
      setError("Inicio debe tener 8 dígitos (ddmmaaaa).");
      return;
    }
    if (form.cierre && form.cierre.length !== 8) {
      setError("Cierre debe tener 8 dígitos (ddmmaaaa).");
      return;
    }

    const inicioFmt = toDDMMYYYY(form.inicio);
    const cierreFmt = toDDMMYYYY(form.cierre);

    setBusy(true);
    try {
      const res = await fetch("/api/casos/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caso: form.caso || null,
          asunto: form.asunto,
          nivel: form.nivel || null,
          agente: form.agente || null,
          // enviamos en formato dd/MM/aaaa si se ingresaron 8 dígitos
          inicio: inicioFmt,
          cierre: cierreFmt,
          descripcion: form.descripcion,
          solucion: form.solucion,
          departamento: (form.departamento || "").toUpperCase()
        })
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "No se pudo crear el caso");
      nav(`/admin/casos/${data.id_caso}`);
    } catch (err) {
      setError(err.message || "Error al enviar el formulario");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen w-full relative overflow-hidden text-white">
      {/* Fondo con imagen + “partículas” (estilo original) */}
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
      <style>{`
        @keyframes float {
          0% { transform: translateY(0) }
          50% { transform: translateY(-10px) }
          100% { transform: translateY(0) }
        }
      `}</style>

      {/* Card */}
      <div className="min-h-screen grid place-items-center p-6">
        <section className="w-full max-w-5xl rounded-2xl border border-white/20 p-10 md:p-14 shadow-[0_20px_60px_rgba(0,0,0,.45)] bg-white/10 backdrop-blur-md relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold uppercase text-white">
              Agregar Casos
            </h1>
            <button
              onClick={() => nav(-1)}
              className="absolute right-6 top-6 px-5 py-2 rounded-full bg-red-500/90 hover:bg-red-600 font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              Regresar
            </button>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {error && (
              <div className="rounded-lg bg-red-600/20 border border-red-400 text-red-200 px-4 py-3">
                {error}
              </div>
            )}

            {/* Fila 1: Caso / Nivel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-semibold text-white">Caso</label>
                <input
                  name="caso"
                  value={form.caso}
                  onChange={handleCasoChange}
                  inputMode="numeric"
                  pattern="\d*"
                  title="Solo números"
                  placeholder="Ingrese el número de caso"
                  autoComplete="off"
                  maxLength={20}
                  className="w-full rounded-full px-4 py-2 bg-gray-200 text-black placeholder-gray-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-white">Nivel (1-3)</label>
                <select
                  name="nivel"
                  value={form.nivel}
                  onChange={handleChange}
                  className="w-full rounded-full px-4 py-2 bg-gray-200 text-black"
                >
                  <option value="">Seleccionar</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </div>
            </div>

            {/* Fila 2: Agente / Departamento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-semibold text-white">Agente</label>
                <select
                  name="agente"
                  value={form.agente}
                  onChange={handleChange}
                  className="w-full rounded-full px-4 py-2 bg-gray-200 text-black"
                  disabled={usuariosLoading}
                >
                  <option value="">
                    {usuariosLoading ? "Cargando..." : "Seleccionar"}
                  </option>
                  {!usuariosLoading && usuarios.length === 0 && (
                    <option value="" disabled>No hay agentes</option>
                  )}
                  {usuarios.map((u) => (
                    <option key={u.id_usuario} value={String(u.id_usuario)}>
                      {u.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-white">Departamento</label>
                <select
                  name="departamento"
                  value={form.departamento}
                  onChange={handleChange}
                  className="w-full rounded-full px-4 py-2 bg-gray-200 text-black"
                  required
                >
                  <option value="">Seleccionar</option>
                  <option value="NET">NET</option>
                  <option value="SYS">SYS</option>
                  <option value="PC">PC</option>
                  <option value="HW">HW</option>
                </select>
              </div>
            </div>

            {/* Fila 3: Inicio / Cierre (solo dígitos) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-semibold text-white">Inicio</label>
                <input
                  name="inicio"
                  value={form.inicio}
                  onChange={(e) => handleFechaDigits("inicio", e)}
                  inputMode="numeric"
                  pattern="\d*"
                  title="8 dígitos: ddmmaaaa"
                  placeholder="ddmmaaaa"
                  maxLength={8}
                  className="w-full rounded-full px-4 py-2 bg-gray-200 text-black placeholder-gray-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-white">Cierre</label>
                <input
                  name="cierre"
                  value={form.cierre}
                  onChange={(e) => handleFechaDigits("cierre", e)}
                  inputMode="numeric"
                  pattern="\d*"
                  title="8 dígitos: ddmmaaaa"
                  placeholder="ddmmaaaa"
                  maxLength={8}
                  className="w-full rounded-full px-4 py-2 bg-gray-200 text-black placeholder-gray-600"
                />
              </div>
            </div>

            {/* Asunto */}
            <div>
              <label className="block font-semibold text-white">Asunto</label>
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
                className="w-full rounded-lg px-4 py-3 bg-gray-200 text-black"
              />
            </div>

            {/* Solución */}
            <div>
              <label className="block font-semibold text-white">Solución (opcional)</label>
              <textarea
                name="solucion"
                value={form.solucion}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-lg px-4 py-3 bg-gray-200 text-black"
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
