import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminAgregarCaso() {
  const nav = useNavigate();

  // Pantalla de resultado
  const SUCCESS_URL = "/admin/casos/estado";

  const [form, setForm] = useState({
    caso: "",
    asunto: "",
    nivel: "",
    agente: "",
    inicio: "",       // ISO yyyy-mm-dd (type="date")
    cierre: "",       // ISO yyyy-mm-dd (type="date")
    descripcion: "",
    solucion: "",
    departamento: ""
  });

  const [usuarios, setUsuarios] = useState([]);
  const [usuariosLoading, setUsuariosLoading] = useState(true);

  const [error, setError] = useState("");      // error general del formulario
  const [casoError, setCasoError] = useState(""); // error específico del número de caso
  const [busy, setBusy] = useState(false);

  // ---------- utils ----------
  const ctl =
    "h-11 w-full rounded-full px-4 border border-gray-300/70 " +
    "bg-gray-200 text-black placeholder-gray-600 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-300";

  const onlyDigits = (s = "") => s.replace(/\D/g, "");

  // ==== Validadores (mismas reglas que Sugerencias) ====
  const isAllSameDigits = (s) => s.length > 0 && /^(\d)\1+$/.test(s);

  // 4+ iguales consecutivos
  const hasSameRun = (s, N = 4) => {
    if (s.length < N) return false;
    let run = 1;
    for (let i = 1; i < s.length; i++) {
      if (s[i] === s[i - 1]) {
        run++;
        if (run >= N) return true;
      } else {
        run = 1;
      }
    }
    return false;
  };

  // 3+ consecutivos asc/desc en cualquier parte
  const hasSequentialRun = (s, N = 3) => {
    if (s.length < N) return false;
    let up = 1, down = 1;
    for (let i = 1; i < s.length; i++) {
      const prev = s.charCodeAt(i - 1);
      const curr = s.charCodeAt(i);
      if (curr === prev + 1) { up++;   down = 1; }
      else if (curr === prev - 1) { down++; up = 1; }
      else { up = 1; down = 1; }
      if (up >= N || down >= N) return true;
    }
    return false;
  };

  const validateCaso = (s) => {
    if (!s) return "Ingresa el número de caso";
    if (!/^\d+$/.test(s)) return "El número de caso solo puede contener dígitos (0–9)";
    if (s.length < 7) return "El número de caso debe tener al menos 7 dígitos";
    if (s.length > 11) return "El número de caso debe tener como máximo 11 dígitos";
    if (isAllSameDigits(s)) return "No se permiten todos los dígitos iguales";
    if (hasSameRun(s, 4)) return "No se permiten 4+ dígitos iguales consecutivos (ej. 0000)";
    if (hasSequentialRun(s, 3)) return "No se permiten números consecutivos (ej. 123 o 321)";
    return "";
  };

  // ISO -> dd/MM/aaaa
  const isoToDDMMYYYY = (iso) => {
    if (!iso) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
    if (!m) return null;
    const [, yyyy, mm, dd] = m;
    return `${dd}/${mm}/${yyyy}`;
  };

  // Lee usuario actual (ajusta claves si es necesario)
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
    // limpia a dígitos y corta a 11
    const solo = onlyDigits(e.target.value).slice(0, 11);
    setForm((prev) => ({ ...prev, caso: solo }));
    setCasoError(validateCaso(solo));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // valida número de caso con mismas reglas
    const casoMsg = validateCaso(form.caso);
    if (casoMsg) { setCasoError(casoMsg); return; }

    // Usuario actual (para auditoría)
    const currentUser = getCurrentUser();
    if (!currentUser?.id) {
      setError("No se detectó el usuario logueado. Vuelve a iniciar sesión.");
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

    // Validación ligera del date-picker (formato ISO)
    if (form.inicio && !/^\d{4}-\d{2}-\d{2}$/.test(form.inicio)) {
      setError("La fecha de Inicio no es válida.");
      return;
    }
    if (form.cierre && !/^\d{4}-\d{2}-\d{2}$/.test(form.cierre)) {
      setError("La fecha de Cierre no es válida.");
      return;
    }

    const inicioFmt = form.inicio ? isoToDDMMYYYY(form.inicio) : null;
    const cierreFmt = form.cierre ? isoToDDMMYYYY(form.cierre) : null;

    setBusy(true);
    try {
      const res = await fetch("/api/casos/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUser.id),
          ...(currentUser.email ? { "x-user-email": currentUser.email } : {}),
        },
        body: JSON.stringify({
          caso: form.caso || null,
          asunto: form.asunto,
          nivel: form.nivel || null,
          agente: form.agente || null,
          inicio: inicioFmt,                 // dd/MM/aaaa o null
          cierre: cierreFmt,                 // dd/MM/aaaa o null
          descripcion: form.descripcion,
          solucion: form.solucion,
          departamento: (form.departamento || "").toUpperCase(),
          creadoPorId: Number(currentUser.id),
        })
      });

      let data = null;
      try { data = await res.json(); } catch { data = {}; }

      // Duplicado
      if (res.status === 409 || data?.error === "DUPLICATE_CASE") {
        const numOut = form.caso || data?.numero_caso || "";
        nav(`${SUCCESS_URL}?ok=0&reason=dup&num=${encodeURIComponent(numOut)}`, { replace: true });
        return;
      }

      // Éxito
      if (res.ok && (data?.ok || data?.id_caso)) {
        const numOut = data?.numero_caso || form.caso || "";
        const newId = data?.id_caso ?? data?.id ?? "";
        nav(`${SUCCESS_URL}?ok=1&id=${encodeURIComponent(newId)}&num=${encodeURIComponent(numOut)}`, { replace: true });
        return;
      }

      const detail = data?.detail || data?.error || `HTTP ${res.status}`;
      throw new Error(detail || "No se pudo crear el caso");
    } catch (err) {
      setError(err.message || "Error al enviar el formulario");
    } finally {
      setBusy(false);
    }
  }

  // ---------- UI ----------
  const minCierre = form.inicio || undefined; // Cierre no puede ser antes de inicio
  const maxInicio = form.cierre || undefined; // Inicio no puede ser después de cierre

  const casoInvalido = !!validateCaso(form.caso);

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
      <style>{`
        @keyframes float { 0%{transform:translateY(0)} 50%{transform:translateY(-10px)} 100%{transform:translateY(0)} }
      `}</style>

      <div className="min-h-screen grid place-items-center p-6">
        <section className="w-full max-w-5xl rounded-2xl border border-white/20 p-10 md:p-14 shadow-[0_20px_60px_rgba(0,0,0,.45)] bg-white/10 backdrop-blur-md relative">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold uppercase text-white">Agregar Casos</h1>
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
                  onPaste={(e) => {
                    e.preventDefault();
                    const clean = onlyDigits(e.clipboardData.getData("text") || "").slice(0, 11);
                    setForm((p) => ({ ...p, caso: clean }));
                    setCasoError(validateCaso(clean));
                  }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  title="7–11 dígitos. Sin consecutivos (123/321) ni 4+ repetidos (0000/1111)."
                  placeholder="Ingrese el número de caso (7–11 dígitos)"
                  autoComplete="off"
                  maxLength={11}
                  className={ctl + (casoError ? " border-red-400 ring-red-300" : "")}
                  aria-invalid={!!casoError}
                />
                {casoError && (
                  <div className="mt-2 text-sm text-red-300">{casoError}</div>
                )}
              </div>
              <div>
                <label className="block font-semibold text-white">Nivel</label>
                <select
                  name="nivel"
                  value={form.nivel}
                  onChange={handleChange}
                  className={ctl}
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
                  className={ctl}
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
                  className={ctl}
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

            {/* Fila 3: Inicio / Cierre con DATE PICKER */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-semibold text-white">Inicio</label>
                <input
                  type="date"
                  name="inicio"
                  value={form.inicio}
                  onChange={handleChange}
                  className={ctl}
                  max={maxInicio}
                  placeholder="dd/mm/aaaa"
                />
              </div>
              <div>
                <label className="block font-semibold text-white">Cierre</label>
                <input
                  type="date"
                  name="cierre"
                  value={form.cierre}
                  onChange={handleChange}
                  className={ctl}
                  min={minCierre}
                  placeholder="dd/mm/aaaa"
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
                className={ctl}
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
              disabled={busy || casoInvalido}
              className="mt-2 mx-auto w-40 h-11 rounded-xl font-extrabold text-white bg-cyan-400 hover:bg-cyan-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy ? "Enviando..." : "Enviar"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
