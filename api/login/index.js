// api/login/index.js
const sql = require('mssql');

// Lee credenciales desde variables de entorno de tu Function App
const config = {
  user: process.env.SQLUSER,
  password: process.env.SQLPASS,
  server: process.env.SQLSERVER, // p.ej. genpactis.database.windows.net
  database: process.env.SQLDB,
  options: { encrypt: true, trustServerCertificate: false }
};

// (opcional) reusar pool entre invocaciones para performance
let poolPromise = null;
async function getPool() {
  if (!poolPromise) poolPromise = sql.connect(config);
  return poolPromise;
}

module.exports = async function (context, req) {
  // CORS / preflight (por si llamas desde otro origen)
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
    return;
  }

  if (req.method !== 'POST') {
    context.res = { status: 405, body: { ok: false, message: 'Method Not Allowed' } };
    return;
  }

  // Acepta "email" o "correo" para ser tolerante con el front
  const emailRaw = (req.body?.email ?? req.body?.correo ?? '').toString().trim().toLowerCase();
  const passwordRaw = (req.body?.password ?? '').toString();

  if (!emailRaw || !passwordRaw) {
    context.res = { status: 400, body: { ok: false, message: 'email/password requeridos' } };
    return;
  }

  try {
    const pool = await getPool();

    // Valida credenciales: compara hash SHA2_256 del password contra la columna contrasena_hash (hex)
    const rs = await pool.request()
      .input('correo', sql.VarChar(256), emailRaw)
      .input('pwd',    sql.VarChar(200), passwordRaw)
      .query(`
        SELECT TOP 1
          id_usuario,
          nombre_completo,
          correo,
          rol,
          activo
        FROM dbo.usuario
        WHERE LTRIM(RTRIM(LOWER(correo))) = @correo
          AND contrasena_hash = CONVERT(varchar(64), HASHBYTES('SHA2_256', @pwd), 2)
          AND activo = 1;
      `);

    if (!rs.recordset.length) {
      context.res = { status: 401, body: { ok: false, message: 'Correo o contraseña inválidos' } };
      return;
    }

    const u = rs.recordset[0];
    const user = {
      id_usuario: u.id_usuario,
      correo: u.correo,
      nombre_completo: u.nombre_completo,
      rol: u.rol
    };

    // Cookies de cortesía (útiles para front/back)
    const cookieAttrs = 'Path=/; SameSite=Lax; Secure; Max-Age=2592000'; // 30 días
    const cookies = [
      `agent_id=${user.id_usuario}; ${cookieAttrs}`,
      `user_email=${encodeURIComponent(user.correo)}; ${cookieAttrs}`
    ];

    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookies
        // Si llamas desde otro origen, habilita CORS:
        // 'Access-Control-Allow-Origin': '*'
      },
      body: { ok: true, user }
    };
  } catch (err) {
    context.log.error('LOGIN ERROR:', err);
    context.res = { status: 500, body: { ok: false, message: 'Error interno en el servidor' } };
  }
};
