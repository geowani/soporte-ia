// app/src/App.jsx
import { useState, useEffect } from "react";
import "./index.css";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Sugerencias from "./pages/Sugerencias";
import Confirmacion from "./pages/Confirmacion";
import Resultados from "./pages/Resultados";
import CasoDetalle from "./pages/CasoDetalle";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAgentes from "./pages/AdminAgentes";
import AdminAgregarCaso from "./pages/AdminAgregarCaso";
import AdminSugerencias from "./pages/AdminSugerencias";
import AdminHistorial from "./pages/AdminHistorial";
import SugerenciaExiste from "./pages/SugerenciaExiste";
import EstadoCasoAgregado from "./pages/EstadoCasoAgregado";

// utils de rol
function normalizeRole(r) {
  return (r || "").toString().trim().toLowerCase();
}
function isAdminRole(r) {
  const x = normalizeRole(r);
  return ["admin", "administrador", "superadmin"].includes(x);
}
function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function getStoredRole() {
  // primero del objeto user, luego del fallback legacy userRole
  const u = getStoredUser();
  if (u && (u.rol || u.role)) return normalizeRole(u.rol || u.role);
  return normalizeRole(localStorage.getItem("userRole") || "user");
}

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [type, setType] = useState("info");
  const [loading, setLoading] = useState(false);
  const [logged, setLogged] = useState(() => localStorage.getItem("logged") === "1");
  const navigate = useNavigate();

  // 🔹 Cada vez que no hay sesión, aseguramos limpiar storage e inputs
  useEffect(() => {
    if (!logged) {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
      setEmail("");
      setPassword("");
      setMsg("");
      setType("info");
    }
  }, [logged]);

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

      // Llamamos directo al backend nuevo
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Error de login");
      }

      // user del backend: { id_usuario, correo, nombre_completo, rol(normalizado), role(alias), isAdmin }
      const user = data.user || {};
      const roleNorm = normalizeRole(user.rol || user.role || "user");
      const isAdmin = isAdminRole(roleNorm);

      // Guardar sesión “moderna”
      localStorage.setItem("logged", "1");
      localStorage.setItem("user", JSON.stringify({ ...user, rol: roleNorm, role: roleNorm, isAdmin }));
      localStorage.setItem("agentId", String(user.id_usuario || "")); // útil para otras pantallas
      // Fallbacks “legacy” (por compatibilidad con tu código previo)
      localStorage.setItem("userRole", roleNorm);
      localStorage.setItem("userEmail", user.correo || email);

      // Cookies de cortesía (el servidor ya las setea, pero reforzamos en front)
      document.cookie = `agent_id=${user.id_usuario || ""}; Path=/; SameSite=Lax; Secure; Max-Age=2592000`;
      if (user.correo) {
        document.cookie = `user_email=${encodeURIComponent(user.correo)}; Path=/; SameSite=Lax; Secure; Max-Age=2592000`;
      }
      document.cookie = `role=${encodeURIComponent(roleNorm)}; Path=/; SameSite=Lax; Secure; Max-Age=2592000`;

      setType("success");
      setMsg("Inicio de sesión exitoso");
      setLogged(true);

      // Redirección sugerida por backend o por rol
      const home = data.home || (isAdmin ? "/admin" : "/dashboard");
      navigate(home, { replace: true });
    } catch (err) {
      setType("error");
      setMsg(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  // Si NO está logueado, muestra el login
  if (!logged) {
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
        <style>{`@keyframes float { 0%{transform:translateY(0)} 50%{transform:translateY(-10px)} 100%{transform:translateY(0)} }`}</style>

        <div className="min-h-screen grid place-items-center p-6">
          <section className="w-full max-w-md rounded-2xl border border-white/20 p-7 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,.45)] bg-white/10 backdrop-blur-md">
            <h1 className="text-center font-extrabold tracking-wide mb-6">INICIO DE SESIÓN</h1>

            <form onSubmit={onSubmit} autoComplete="off" className="flex flex-col gap-4">
              <label className="flex flex-col gap-2 font-semibold text-slate-200">
                <span>Correo:</span>
                <input
                  className="w-full rounded-full bg-slate-100 text-slate-900 px-4 py-3 outline-none shadow-inner shadow-black/10 focus:ring-4 ring-cyan-300"
                  type="email"
                  placeholder="Correo"
                  value={email}
                  onChange={(e)=>setEmail(e.target.value)}
                  autoComplete="username"
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
                  autoComplete="current-password"
                />
              </label>

              <button
                disabled={loading}
                type="submit"
                className="mt-2 mx-auto w-40 h-11 rounded-xl font-extrabold text-white transition-transform active:translate-y-0 hover:-translate-y-0.5"
                style={{ backgroundColor: "#59d2e6", boxShadow: "0 8px 22px rgba(89,210,230,.30)" }}
                onMouseOver={(e)=> e.currentTarget.style.boxShadow = "0 10px 26px rgba(89,210,230,.38)"}
                onMouseOut={(e)=> e.currentTarget.style.boxShadow = "0 8px 22px rgba(89,210,230,.30)"}
              >
                {loading ? "Verificando..." : "Iniciar sesión"}
              </button>
            </form>

            {msg && (
              <div className={
                "mt-5 text-center text-sm " +
                (type==="success" ? "text-emerald-300" : type==="error" ? "text-rose-300" : "text-slate-300")
              }>
                {msg}
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }

  // logout: limpia todo y resetea UI del login
  const onLogout = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    // limpia cookies
    document.cookie = "agent_id=; Path=/; Max-Age=0; SameSite=Lax; Secure";
    document.cookie = "user_email=; Path=/; Max-Age=0; SameSite=Lax; Secure";
    document.cookie = "role=; Path=/; Max-Age=0; SameSite=Lax; Secure";

    // reset de estados de UI
    setLogged(false);
    setEmail("");
    setPassword("");
    setMsg("");
    setType("info");

    // regresar a raíz (el login aparece al no estar logueado)
    navigate("/", { replace: true });
  };

  const role = getStoredRole();

  return (
    <Routes>
      {/* Redirección raíz según rol */}
      <Route
        path="/"
        element={<Navigate to={isAdminRole(role) ? "/admin" : "/dashboard"} replace />}
      />

      {/* Admin Home */}
      <Route
        path="/admin"
        element={
          isAdminRole(role)
            ? <AdminDashboard onLogout={onLogout} />
            : <Navigate to="/dashboard" replace />
        }
      />

      {/* Admin: Agentes con más búsquedas */}
      <Route
        path="/admin/agentes"
        element={
          isAdminRole(role)
            ? <AdminAgentes />
            : <Navigate to="/dashboard" replace />
        }
      />

      {/* Admin: Agregar caso */}
      <Route
        path="/admin/agregar-caso"
        element={
          isAdminRole(role)
            ? <AdminAgregarCaso />
            : <Navigate to="/dashboard" replace />
        }
      />

      {/* Admin: Lista de sugerencias */}
      <Route
        path="/admin/sugerencias"
        element={
          isAdminRole(role)
            ? <AdminSugerencias />
            : <Navigate to="/dashboard" replace />
        }
      />

      {/* Admin: Historial */}
      <Route
        path="/admin/historial"
        element={
          isAdminRole(role)
            ? <AdminHistorial />
            : <Navigate to="/dashboard" replace />
        }
      />

      {/* Rutas de usuario */}
      <Route path="/dashboard" element={<Dashboard isBlocked={true} onLogout={onLogout} />} />
      <Route path="/sugerencias" element={<Sugerencias />} />
      <Route path="/confirmacion" element={<Confirmacion />} />
      <Route path="/resultados" element={<Resultados />} />
      <Route path="/caso/:id" element={<CasoDetalle />} />
      <Route path="/ya-sugerido" element={<SugerenciaExiste />} />
      <Route path="/admin/casos/estado" element={<EstadoCasoAgregado />} />

      <Route
        path="*"
        element={<Navigate to={isAdminRole(role) ? "/admin" : "/dashboard"} replace />}
      />
    </Routes>
  );
}
