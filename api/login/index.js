// api/login/index.js
const sql = require('mssql');

// Credenciales desde variables de entorno
const config = {
  user: process.env.SQLUSER,
  password: process.env.SQLPASS,
  server: process.env.SQLSERVER, // genpactis.database.windows.net
  database: process.env.SQLDB,
  options: { encrypt: true, trustServerCertificate: false }
};

// Reusar pool entre invocaciones
let poolPromise = null;
async function getPool() {
  if (!poolPromise) poolPromise = sql.connect(config);
  return poolPromise;
}

module.exports = async function (context, req) {
  // Preflight CORS
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

  // Acepta "email" o "correo" desde el front
  const emailRaw = (req.body?.email ?? req.body?.correo ?? '').toString().trim().toLowerCase();
  const passwordRaw = (req.body?.password ?? '').toString();

  if (!emailRaw || !passwordRaw) {
    context.res = { status: 400, body: { ok: false, message: 'email/password requeridos' } };
    return;
  }

  try {
    const pool = await getPool();

    // Valida credenciales
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

    // Normaliza rol y calcula isAdmin
    const roleNorm = String(u.rol || '').trim().toLowerCase();
    const isAdmin = ['admin', 'administrador', 'superadmin'].includes(roleNorm);

    const user = {
      id_usuario: u.id_usuario,
      correo: u.correo,
      nombre_completo: u.nombre_completo,
      rol: roleNorm,     // mantiene clave 'rol'
      role: roleNorm,   
      isAdmin            
    };

    const home = isAdmin ? '/admin' : '/dashboard';

    // Cookies útiles para front/back
    const cookieAttrs = 'Path=/; SameSite=Lax; Secure; Max-Age=2592000'; // 30 días
    const cookies = [
      `agent_id=${user.id_usuario}; ${cookieAttrs}`,
      `user_email=${encodeURIComponent(user.correo)}; ${cookieAttrs}`,
      `role=${encodeURIComponent(roleNorm)}; ${cookieAttrs}`
    ];

    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookies
      },
      body: { ok: true, user, home }
    };
  } catch (err) {
    context.log.error('LOGIN ERROR:', err);
    context.res = { status: 500, body: { ok: false, message: 'Error interno en el servidor' } };
  }
};
