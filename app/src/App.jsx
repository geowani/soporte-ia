import { useState } from "react";
import { login } from "./api";

export default function App() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg]           = useState("");
  const [type, setType]         = useState("info"); // 'success' | 'error' | 'info'
  const [loading, setLoading]   = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setType("info");

    // Validación básica
    if (!email || !password) {
      setMsg("Completa correo y contraseña.");
      setType("error");
      return;
    }
    // Validar formato de email simple
    const okEmail = /\S+@\S+\.\S+/.test(email);
    if (!okEmail) {
      setMsg("Ingresa un correo válido.");
      setType("error");
      return;
    }

    try {
      setLoading(true);
      const res = await login(email, password);
      setMsg(res.message || "Inicio de sesión exitoso");
      setType("success");
      // Aquí podrías navegar a otra vista (dashboard) cuando integremos routing
    } catch (e) {
      setMsg(e.message || "Correo o contraseña inválidos");
      setType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 grid place-items-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-6">
        <h1 className="text-xl font-bold mb-1">Bienvenido</h1>
        <p className="text-sm text-gray-600 mb-6">Inicia sesión para continuar</p>

        {msg && (
          <div
            className={`mb-4 rounded-lg px-3 py-2 text-sm border ${
              type === "success"
                ? "bg-green-50 text-green-700 border-green-200"
                : type === "error"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-gray-50 text-gray-700 border-gray-200"
            }`}
          >
            {msg}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Correo</label>
            <input
              type="email"
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/20"
              placeholder="tucorreo@dominio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <input
              type="password"
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/20"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-black text-white py-2 font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Iniciar sesión"}
          </button>
        </form>

        <div className="mt-4 text-xs text-gray-500">
          Prueba éxito: <code>demo@empresa.com</code> / <code>123456</code>
        </div>
      </div>
    </div>
  );
}
