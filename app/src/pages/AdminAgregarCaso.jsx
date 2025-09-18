import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminAgregarCaso() {
  const nav = useNavigate();

  // Ruta de pantalla de resultado
  const SUCCESS_URL = "/admin/casos/estado";

  const [form, setForm] = useState({
    caso: "",
    asunto: "",
    nivel: "",
    agente: "",
    inicio: "",       // máscara dd/mm/aaaa
    cierre: "",       // máscara dd/mm/aaaa
    descripcion: "",
    solucion: "",
    departamento: ""
  });

  const [usuarios, setUsuarios] = useState([]);
  const [usuariosLoading, setUsuariosLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // ---------- utils ----------
  const onlyDigits = (s = "") => s.replace(/\D/g, "");

  // Aplica máscara dd/mm/aaaa a partir de dígitos
  const maskFecha = (value) => {
    const d = onlyDigits(value).slice(0, 8); // ddmmaaaa
    if (d.length <= 2) return d;
    if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
    return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  };

  const toDDMMYYYY = (masked) => {
    const d = onlyDigits(masked);
    return d.length === 8 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : null;
  };

  // Lee usuario actual del storage (ajusta claves si es necesario)
  function getCurrentUser() {
    try {
      const keys = ["authUser", "user", "sessionUser"];
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const u = JSON.parse(raw);
          return {
            id: u.id_usuario ?? u.userId ?? u.id ?? null,
            email: u.email ?? u.correo ?? null,
            nombre: u.nombre ?? u.displayName ?? null,
          };
        }
      }
    } catch {}
    return null;
  }

  // ---------- data ----------
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

  // -------- handlers --------
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleCasoChange(e) {
    const solo = onlyDigits(e.target.value);
    setForm((prev) => ({ ...prev, caso: solo }));
  }

  function handleFechaMasked(name, e) {
    const masked = maskFecha(e.target.value);
    setForm((prev) => ({ ...prev, [name]: masked }));
  }

  function handleFechaPaste(name, e) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text") || "";
    const masked = maskFecha(text);
    setForm((prev) => ({ ...prev, [name]: masked }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Usuario actual (para auditoría)
    const currentUser = getCurrentUser();
    if (!currentUser?.id) {
      setError("No se detectó el usuario logueado. Vuelve a iniciar sesión.");
      return;
    }

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

    const inicioFmt = toDDMMYYYY(form.inicio);
    const cierreFmt = toDDMMYYYY(form.cierre);

    if (form.inicio && !inicioFmt) {
      setError("Inicio debe tener 8 dígitos (dd/mm/aaaa).");
      return;
    }
    if (form.cierre && !cierreFmt) {
      setError("Cierre debe tener 8 dígitos (dd/mm/aaaa).");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/casos/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Enviamos también por header para middleware/back
          "x-user-id": String(currentUser.id),
          ...(currentUser.email ? { "x-user-email": currentUser.email } : {}),
        },
        body: JSON.stringify({
          caso: form.caso || null,
          asunto: form.asunto,
          nivel: form.nivel || null,
          agente: form.agente || null,      // agente asignado (select)
          inicio: inicioFmt,                 // dd/MM/aaaa o null
          cierre: cierreFmt,                 // dd/MM/aaaa o null
          descripcion: form.descripcion,
          solucion: form.solucion,
          departamento: (form.departamento || "").toUpperCase(),

          // NUEVO: quién creó el caso (id de la persona que inició sesión)
          creadoPorId: Number(currentUser.id),
        })
      });

      // Si la respuesta no es JSON válido, intenta leer texto para debug
      let data = null;
      try { data = await res.json(); } catch { data = {}; }

      // Duplicado: 409 del backend
      if (res.status === 409 || data?.error === "DUPLICATE_CASE") {
        const numOut = form.caso || data?.numero_caso || "";
        nav(
          `${SUCCESS_URL}?ok=0&reason=dup&num=${encodeURIComponent(numOut)}`,
          { replace: true }
        );
        return;
      }

      // Éxito (ajusta claves si tu backend retorna otras)
      if (res.ok && (data?.ok || data?.id_caso)) {
        const numOut = data?.numero_caso || form.caso || "";
        const newId = data?.id_caso ?? data?.id ?? "";
        nav(
          `${SUCCESS_URL}?ok=1&id=${encodeURIComponent(newId)}&num=${encodeURIComponent(numOut)}`,
          { replace: true }
        );
        return;
      }

      // Otros errores con mensaje del backend
      const detail = data?.detail || data?.error || `HTTP ${res.status}`;
      throw new Error(detail || "No se pudo crear el caso");
    } catch (err) {
      setError(err.message || "Error al enviar el formulario");
    } finally {
      setBusy(false);
    }
  }

  // ---------- UI (estilo con fondo original) ----------
  return (
    <main className="min-h-screen w-full relative overflow-hidden text-white">
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

      <div className="min-h-screen grid place-items-center p-6">
        <section className="w-full max-w-5xl rounded-2xl border border-white/20 p-10 md:p-14 shadow-[0_20px_60px_rgba(0,0,0,.45)] bg-white/10 backdrop-blur-md relative">
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
                <label className="block font-semibold text-white">Nivel</label>
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
                  <option value="">{usuariosLoading ? "Cargando..." : "Seleccionar"}</option>
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

            {/* Fila 3: Inicio / Cierre con máscara visible */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-semibold text-white">Inicio</label>
                <input
                  name="inicio"
                  value={form.inicio}
                  onChange={(e) => handleFechaMasked("inicio", e)}
                  onPaste={(e) => handleFechaPaste("inicio", e)}
                  inputMode="numeric"
                  pattern="[0-9/]*"
                  title="Formato: dd/mm/aaaa"
                  placeholder="dd/mm/aaaa"
                  maxLength={10}
                  className="w-full rounded-full px-4 py-2 bg-gray-200 text-black placeholder-gray-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-white">Cierre</label>
                <input
                  name="cierre"
                  value={form.cierre}
                  onChange={(e) => handleFechaMasked("cierre", e)}
                  onPaste={(e) => handleFechaPaste("cierre", e)}
                  inputMode="numeric"
                  pattern="[0-9/]*"
                  title="Formato: dd/mm/aaaa"
                  placeholder="dd/mm/aaaa"
                  maxLength={10}
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
              <label className="block font-semibold text-white">Solución</label>
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
