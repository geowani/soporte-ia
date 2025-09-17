import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function useQS() {
  const { search, state } = useLocation();
  const qs = useMemo(() => new URLSearchParams(search), [search]);

  const okQS = qs.get("ok");
  const ok =
    state?.ok ??
    (okQS === "1" || okQS === "true" || okQS === "yes"
      ? true
      : okQS === "0" || okQS === "false"
      ? false
      : undefined);

  return {
    ok,
    id:  state?.id  ?? qs.get("id")  ?? null,
    num: state?.num ?? qs.get("num") ?? null,
    reason: state?.reason ?? qs.get("reason") ?? null,
  };
}

export default function EstadoCasoAgregado() {
  const { ok, id, num, reason } = useQS();
  const nav = useNavigate();

  const isSuccess   = ok === true || (ok === undefined && !!id);
  const isDuplicate = ok === false && reason === "dup";

  const title = "Panel de Administrador";
  const mainMsg = isSuccess
    ? "Muchas gracias, su caso fue agregado exitosamente al sistema."
    : isDuplicate
    ? "Este número de caso ya existe en el sistema."
    : "No se pudo completar la operación.";

  const icon = isSuccess ? "✅" : "❌";

  return (
    <main className="min-h-screen w-full relative overflow-hidden text-white">
      {/* Fondo */}
      <div
        className="absolute inset-0 -z-20"
        style={{
          backgroundImage: "url('/fondo.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Botón regresar */}
      <button
        onClick={() => nav(-1)}
        className="absolute right-6 top-6 px-5 py-2 rounded-full bg-red-500/90 hover:bg-red-600 font-semibold shadow-md transition focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        REGRESAR
      </button>

      <div className="min-h-screen grid place-items-center p-6">
        <section className="w-full max-w-4xl">
          <h1 className="text-center text-3xl md:text-4xl font-extrabold mb-8">
            {title}
          </h1>

          <div className="mx-auto max-w-2xl rounded-2xl bg-white/10 border border-white/20 p-10 md:p-12 text-center shadow-[0_20px_60px_rgba(0,0,0,.45)] backdrop-blur-md">
            <p className="text-xl md:text-2xl font-semibold leading-relaxed">
              {mainMsg}
            </p>

            <div className="text-7xl mt-6">{icon}</div>

            {/* Mostrar primero el número de caso. Solo mostrar ID si no hay número. */}
            <div className="mt-5 space-y-1 text-white/90">
              {num ? (
                <p>
                  Número de caso: <b>{num}</b>
                </p>
              ) : (
                id && (
                  <p>
                    ID interno: <b>{id}</b>
                  </p>
                )
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}