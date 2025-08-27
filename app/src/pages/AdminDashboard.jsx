export default function AdminDashboard({ onLogout }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-blue-900">
      <div className="bg-gray-200 rounded-lg shadow-lg p-6 w-[400px]">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">Administrador</h1>
          <button
            onClick={onLogout}
            className="text-blue-600 font-semibold hover:underline"
          >
            Salir
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <button className="text-blue-600 font-semibold text-left border-b border-black pb-1">
            Agentes con más búsquedas
          </button>
          <button className="text-blue-600 font-semibold text-left border-b border-black pb-1">
            Agregar caso al sistema
          </button>
          <button className="text-blue-600 font-semibold text-left border-b border-black pb-1">
            Revisar las sugerencias
          </button>
          <button className="text-blue-600 font-semibold text-left border-b border-black pb-1">
            Historial de casos
          </button>
        </div>
      </div>
    </div>
  );
}
