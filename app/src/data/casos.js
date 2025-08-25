// Datos de prueba (puedes agregar más)
export const CASOS = [
  {
    id: "1052505",
    area: "SYS",
    inicio: "2025-03-05",
    cierre: "2025-03-05",
    titulo: "Usuario no puede iniciar sesión",
    descripcion:
      "Al ingresar mi información el sistema (Drive) muestra un mensaje diciendo que mi usuario está bloqueado por múltiples intentos fallidos de iniciar sesión.",
    solucion:
      "Desde la función UUP se hizo el reseteo del contador de intentos de sesión. Ahora el usuario puede ingresar al sistema sin problemas.",
    resueltoPor: "Jim Webb",
    departamento: "SYS",
    nivel: "2",
  },
  {
    id: "0895420",
    area: "PC",
    inicio: "2025-02-18",
    cierre: "2025-02-18",
    titulo: "No se puede cerrar una orden de reparación",
    descripcion:
      "Al intentar cerrar la orden, el sistema lanza un error de validación.",
    solucion:
      "Se corrigieron datos obligatorios faltantes y se reintentó el cierre desde el módulo de órdenes.",
    resueltoPor: "Anna Price",
    departamento: "PC",
    nivel: "1",
  },
  {
    id: "1024156",
    area: "PC",
    inicio: "2025-01-21",
    cierre: "2025-01-22",
    titulo: "No recibe mensaje de verificación",
    descripcion:
      "Los correos de verificación no llegan al buzón del usuario.",
    solucion:
      "Se actualizó la dirección de correo y se liberó en el filtro antispam; el usuario ya recibe verificaciones.",
    resueltoPor: "Carlos Ruiz",
    departamento: "PC",
    nivel: "1",
  },
];
