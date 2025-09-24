import { useState } from "react";
import { useNavigate } from "react-router-dom";

// Detectar el agente (sin JWT)
function getAgentId() {
  const a = localStorage.getItem("agentId");
  if (a && Number(a) > 0) return Number(a);
  try {
    const raw = localStorage.getItem("user") || localStorage.getItem("usuario") || "";
    if (raw) {
      const u = JSON.parse(raw);
      const cands = [u.id_usuario, u.id, u.agente_id, u.userId, u.agentId];
      for (const v of cands) { const n = Number(v); if (Number.isInteger(n) && n > 0) return n; }
    }
  } catch {}
  const m = document.cookie.match(/(?:^|;\s*)agent_id=(\d+)/);
  if (m && Number(m[1]) > 0) return Number(m[1]);
  return 0;
}

// Correo del usuario para que el backend pueda resolver id si hace falta
function getUserEmail() {
  try {
    const raw = localStorage.getItem("user") || localStorage.getItem("usuario") || "";
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.correo) return String(u.correo).toLowerCase();
      if (u?.email) return String(u.email).toLowerCase();
    }
  } catch {}
  const m = document.cookie.match(/(?:^|;\s*)user_email=([^;]+)/);
  if (m) return decodeURIComponent(m[1]).toLowerCase();
  return "";
}

// =====================
// Helpers de validación
// =====================
const onlyDigits = (s) => s.replace(/[^\d]/g, "");

// Todo el número igual (0000000, 1111111, etc.)
const isAllSameDigits = (s) => s.length > 0 && /^(\d)\1+$/.test(s);

// Racha de N (o más) dígitos iguales consecutivos en cualquier parte
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

// Racha de N (o más) consecutivos +/-1 en cualquier parte (…123…, …321…)
const hasSequentialRun = (s, N = 3) => {
  if (s.length < N) return false;
  let up = 1, down = 1;
  for (let i = 1; i < s.length; i++) {
    const prev = s.charCodeAt(i - 1);
    const curr = s.charCodeAt(i);
    if (curr === prev + 1) {        // ascendente
      up++;   down = 1;
    } else if (curr === prev - 1) { // descendente
      down++; up = 1;
    } else {
      up = 1; down = 1;
    }
    if (up >= N || down >= N) return true;
  }
  return false;
};

const validateCase = (s) => {
  if (!s) return { ok: false, msg: "La sugerencia de caso debe contener únicamente números" };
  if (!/^\d+$/.test(s)) return { ok: false, msg: "Solo se permiten dígitos (0-9)" };

  // Longitud 7–11
  if (s.length < 7) return { ok: false, msg: "El número de caso debe tener al menos 7 dígitos" };
  if (s.length > 11) return { ok: false, msg: "El número de caso debe tener como máximo 11 dígitos" };

  // Reglas de patrón
  if (isAllSameDigits(s))        return { ok: false, msg: "No se permiten todos los dígitos iguales" };
  if (hasSameRun(s, 4))          return { ok: false, msg: "No se permiten 4+ dígitos iguales consecutivos (ej. 0000)" };
  if (hasSequentialRun(s, 3))    return { ok: false, msg: "No se permiten números consecutivos (ej. 123 o 321)" };

  return { ok: true, msg: "" };
};

export default function Sugerencias() {
  const [caso, setCaso] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    // limpia a dígitos y corta a 11
    const clean = onlyDigits(e.target.value).slice(0, 11);
    setCaso(clean);
    setError(validateCase(clean).msg);
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    const { ok, msg } = validateCase(caso);
    if (!ok) {
      setError(msg);
      return;
    }

    const agentId = getAgentId();
    const userEmail = getUserEmail();

    if (!agentId && !userEmail) {
      alert("Sesión no válida. Inicia sesión de nuevo.");
      navigate("/");
      return;
    }

    const payload = {
      numeroCaso: caso.trim(),
      ...(agentId ? { agenteId: agentId } : {})
    };

    try {
      setSending(true);

      const headers = {
        "Content-Type": "application/json",
        ...(agentId ? { "x-agent-id": String(agentId) } : {}),
        ...(userEmail ? { "x-user-email": userEmail } : {})
      };

      const res = await fetch("/api/sugerencias", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        credentials: "same-origin"
      });

      const txt = await res.text();

      if (res.status === 409) {
        let data = {};
        try { data = txt ? JSON.parse(txt) : {}; } catch {}
        const ex = data?.existing || {};
        const who =
          (ex.agenteNombre && ex.agenteNombre.trim()) ? ex.agenteNombre :
          (ex.agenteEmail && ex.agenteEmail.trim())   ? ex.agenteEmail   :
          (ex.agenteId ? `ID ${ex.agenteId}` : "");

        sessionStorage.setItem("dup_case", ex.numeroCaso || payload.numeroCaso);
        if (ex.id) sessionStorage.setItem("dup_id", String(ex.id));
        if (who) sessionStorage.setItem("dup_agent", String(who));

        navigate("/ya-sugerido", {
          state: {
            caso: ex.numeroCaso || payload.numeroCaso,
            id: ex.id ?? null,
            agente: who
          }
        });
        setSending(false);
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status} - ${txt}`);

      let body = {};
      try { body = txt ? JSON.parse(txt) : {}; } catch {}
      const nuevoId = body?.id ?? body?.row?.id ?? null;

      sessionStorage.setItem("last_sug_case", payload.numeroCaso);
      if (nuevoId) sessionStorage.setItem("last_sug_id", String(nuevoId));

      navigate("/confirmacion", { state: { caso: payload.numeroCaso, id: nuevoId } });
    } catch (err) {
      console.error(err);
      alert(`No se pudo enviar la sugerencia.\n${String(err)}`);
    } finally {
      setSending(false);
    }
  };

  const invalid = !!validateCase(caso).msg;

  return (
    <main className="min-h-screen w-full relative overflow-hidden text-white">
      <div
        className="absolute inset-0 -z-20"
        style={{
          backgroundImage: "url('/fondo.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="w-full flex justify-end p-6">
        <button
          onClick={() => navigate("/dashboard")}
          className="px-5 py-2 rounded-full bg-red-500/90 hover:bg-red-600 text-white font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-white/50"
        >
          REGRESAR
        </button>
      </div>

      <div className="min-h-screen grid place-items-center p-6 -mt-20">
        <section className="w-full max-w-2xl text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-6">SUGERENCIAS DE CASOS</h1>

          <div className="mx-auto w-full rounded-2xl bg-black/30 backdrop-blur-md p-6 sm:p-8 border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,.45)]">
            <p className="text-slate-200 leading-relaxed mb-6">
              En este espacio puedes sugerir la inclusión de casos repetitivos que aún no hayan sido agregados
            </p>

            <form onSubmit={onSubmit} className="flex flex-col items-center gap-4" noValidate>
              <label className="w-full max-w-md text-xl font-semibold">Caso</label>

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={11}
                className="w-full max-w-md rounded-full bg-slate-100 text-slate-900 px-4 py-3 outline-none shadow-inner shadow-black/10 focus:ring-4 ring-cyan-300 text-center tracking-widest"
                placeholder="Número de Caso (7–11 dígitos)"
                value={caso}
                onChange={handleChange}
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = e.clipboardData.getData("text") || "";
                  const clean = onlyDigits(pasted).slice(0, 11);
                  setCaso(clean);
                  setError(validateCase(clean).msg);
                }}
                autoComplete="off"
                aria-invalid={invalid}
                title="7–11 dígitos. Sin consecutivos (123/321) ni 4+ repetidos (0000/1111)."
              />

              {error && (
                <div className="text-red-300 text-sm -mt-2">{error}</div>
              )}

              <button
                type="submit"
                disabled={sending || invalid}
                className="mt-2 w-40 h-11 rounded-xl font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#59d2e6", boxShadow: "0 8px 22px rgba(89,210,230,.30)" }}
              >
                {sending ? "Enviando…" : "Enviar"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
