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

export default function Sugerencias() {
  const [caso, setCaso] = useState("");
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!caso.trim()) return alert("Ingresa el número de caso");

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

      console.debug("[SUG:submit] payload:", payload, "headers:", headers);

      const res = await fetch("/api/sugerencias", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        credentials: "same-origin"
      });

      const txt = await res.text();
      console.debug("[POST /api/sugerencias] status:", res.status, "body:", txt);

      // ⛔ Duplicado: el backend devuelve 409
      if (res.status === 409) {
        let data = {};
        try { data = txt ? JSON.parse(txt) : {}; } catch {}
        const ex = data?.existing;
        alert(
          `Este número de caso ya fue sugerido.\n` +
          (ex?.numeroCaso ? `Caso: ${ex.numeroCaso}\n` : "") +
          (ex?.id ? `ID existente: ${ex.id}\n` : "") +
          (ex?.agenteId ? `Agente ID: ${ex.agenteId}` : "")
        );
        return; // no navegar a confirmación
      }

      if (!res.ok) throw new Error(`HTTP ${res.status} - ${txt}`);

      let body = {};
      try { body = txt ? JSON.parse(txt) : {}; } catch {}
      const nuevoId = body?.id ?? body?.row?.id ?? null;

      // Fallback si recargan confirmación
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

            <form onSubmit={onSubmit} className="flex flex-col items-center gap-4">
              <label className="w-full max-w-md text-xl font-semibold">Caso</label>
              <input
                type="text"
                inputMode="numeric"
                className="w-full max-w-md rounded-full bg-slate-100 text-slate-900 px-4 py-3 outline-none shadow-inner shadow-black/10 focus:ring-4 ring-cyan-300 text-center tracking-widest"
                placeholder="Número de Caso"
                value={caso}
                onChange={(e) => setCaso(e.target.value)}
              />
              <button
                type="submit"
                disabled={sending}
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
