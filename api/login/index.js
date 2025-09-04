const sql = require('mssql');

const config = {
  user: process.env.SQLUSER,
  password: process.env.SQLPASS,
  server: process.env.SQLSERVER,
  database: process.env.SQLDB,
  options: { encrypt: true, trustServerCertificate: false }
};

module.exports = async function (context, req) {
  // Soporta preflight
  if (req.method === 'OPTIONS') {
    context.res = { status: 204 };
    return;
  }

  if (req.method !== 'POST') {
    context.res = { status: 405, body: { ok: false, message: 'Method Not Allowed' } };
    return;
  }

  const email = (req.body?.email || '').toLowerCase().trim();
  const password = req.body?.password || '';

  if (!email || !password) {
    context.res = { status: 400, body: { ok: false, message: 'email/password requeridos' } };
    return;
  }

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('correo', sql.VarChar(160), email)
      .input('pwd',    sql.VarChar(200), password)
      .query(`
        SELECT id_usuario, nombre_completo, correo, rol
        FROM dbo.usuario
        WHERE correo = @correo
          AND contrasena_hash = CONVERT(varchar(64), HASHBYTES('SHA2_256', @pwd), 2)
          AND activo = 1;
      `);

    if (result.recordset.length === 0) {
      context.res = { status: 401, body: { ok: false, message: 'Correo o contraseña inválidos' } };
      return;
    }

    const u = result.recordset[0];
    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { ok: true, message: 'Inicio de sesión exitoso', email: u.correo, role: u.rol }
    };
  } catch (err) {
    context.log.error('DB error:', err);
    context.res = { status: 500, body: { ok: false, message: 'Error interno en el servidor' } };
  }
};
