// src/data/cases.js
export const CASES = [
  {
    id: "1052505",
    titulo: "Usuario no puede iniciar sesión",
    descripcion: "El usuario reporta bloqueo al iniciar sesión en SYS.",
    area: "SYS",
    prioridad: "Alta",
    estado: "Abierto",
    creadoEl: "2025-08-01 09:14",
    actualizadoEl: "2025-08-02 10:31",
    tags: ["login", "bloqueo", "MFA"],
    pasos: [
      "Verificar estado del usuario en Azure AD.",
      "Revisar MFA y restablecer si es necesario.",
      "Limpiar credenciales guardadas (Credential Manager).",
      "Probar inicio de sesión en otro equipo."
    ],
    solucionSugerida:
      "Desbloquear cuenta en AD, forzar cambio de contraseña y reprovisionar MFA.",
    relacionados: ["0895420", "1024156"],
  },
  {
    id: "0895420",
    titulo: "Usuario no puede cerrar una orden de reparación",
    descripcion: "Error al confirmar cierre en módulo de órdenes.",
    area: "PC",
    prioridad: "Media",
    estado: "En progreso",
    creadoEl: "2025-07-28 14:22",
    actualizadoEl: "2025-07-28 16:05",
    tags: ["orden", "workflow"],
    pasos: [
      "Validar permisos del rol.",
      "Revisar reglas de workflow.",
      "Comprobar datos requeridos para cierre."
    ],
    solucionSugerida:
      "Asignar permiso 'CerrarOrden' y reintentar transición.",
    relacionados: [],
  },
  {
    id: "1024156",
    titulo: "Usuario no puede recibir mensaje de verificación",
    descripcion: "SMS de verificación no llega al dispositivo.",
    area: "PC",
    prioridad: "Media",
    estado: "Abierto",
    creadoEl: "2025-07-20 11:02",
    actualizadoEl: "2025-07-20 11:40",
    tags: ["sms", "otp", "verificación"],
    pasos: [
      "Confirmar prefijo país y formato E.164 (+502...).",
      "Revisar ventana de envío del proveedor.",
      "Probar canal alterno (correo/llamada)."
    ],
    solucionSugerida:
      "Corregir número a formato E.164 y reemitir OTP.",
    relacionados: ["1052505"],
  },
];

export const getCaseById = (id) => CASES.find(c => c.id === id);
