import { useState } from "react";
import { login } from "./api";
import "./index.css";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [type, setType] = useState("info"); // success | error | info
  const [loading, setLoading] = useState(false);
  const [logged, setLogged] = useState(() => localStorage.getItem("logged") === "1");

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg(""); setType("info");
    if (!email || !password) {
      setMsg("Completa correo y contraseña.");
      setType("error");
      return;
    }
    try {
      setLoading(true);
      const r = await login(email, password);        // <— tu verificación actual
      setType("success");
      setMsg(r?.message || "Inicio de sesión exitoso");
      localStorage.setItem("logged", "1");           // <— persistir sesión sin BD
      setLogged(true);                               // <— mostrar Dashboard
    } catch (err) {
      setType("error");
      setMsg(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  // Si ya inició sesión, mostramos el Dashboard
  if (logged) {
    return (
      <Dashboard
        isBlocked={true} // cámbialo a false cuando quieras habilitar la búsqueda
        onLogout={() => { localStorage.removeItem("logged"); setLogged(false); }}
      />
    );
  }

  // Pantalla de login (la tuya, tal cual con tu estilo de fondo y partículas)
  return (
    <main className="min-h-screen w-full relative overflow-hidden text-white">
      {/* Fondo con tu imagen */}
      <div
        className="absolute inset-0 -z-20"
        style={{
          backgroundImage: "url('/fondo.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      />
      {/* Partículas */}
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

      <div className="min-h-screen grid place-items-center p-6">
        <section className="w-full max-w-md rounded-2xl border border-white/20 p-7 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,.45)] bg-white/10 backdrop-blur-md">
          <h1 className="text-center font-extrabold tracking-wide mb-6">INICIO DE SESIÓN</h1>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2 font-semibold text-slate-200">
              <span>Correo:</span>
              <input
                className="w-full rounded-full bg-slate-100 text-slate-900 px-4 py-3 outline-none shadow-inner shadow-black/10 focus:ring-4 ring-cyan-300"
                type="email"
                placeholder="demo@empresa.com"
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2 font-semibold text-slate-200">
              <span>Contraseña:</span>
              <input
                className="w-full rounded-full bg-slate-100 text-slate-900 px-4 py-3 outline-none shadow-inner shadow-black/10 focus:ring-4 ring-cyan-300"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
              />
            </label>

            <button
              disabled={loading}
              type="submit"
              className="mt-2 mx-auto w-40 h-11 rounded-xl font-extrabold text-[#0b2230] transition-transform active:translate-y-0 hover:-translate-y-0.5"
              style={{ backgroundColor: "#59d2e6", boxShadow: "0 8px 22px rgba(89,210,230,.30)" }}
              onMouseOver={(e)=> e.currentTarget.style.boxShadow = "0 10px 26px rgba(89,210,230,.38)"}
              onMouseOut={(e)=> e.currentTarget.style.boxShadow = "0 8px 22px rgba(89,210,230,.30)"}
            >
              {loading ? "Verificando..." : "Iniciar sesión"}
            </button>
          </form>

          {msg && (
            <div className={"mt-5 text-center text-sm " + (type==="success" ? "text-emerald-300" : type==="error" ? "text-rose-300" : "text-slate-300")}>
              {msg}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
