const sql = require('mssql');

const config = {
  user: process.env.SQLUSER,
  password: process.env.SQLPASS,
  server: process.env.SQLSERVER,
  database: process.env.SQLDB,
  options: { encrypt: true, trustServerCertificate: false }
};

module.exports = async function (context, req) {
  if (req.method === 'OPTIONS') {
    context.res = { status: 204 };
    return;
  }

  let email = (req.body?.email || '').toLowerCase().trim();
  let password = req.body?.password || '';

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('correo', sql.VarChar(160), email)
      .input('pwd', sql.VarChar(200), password)
      .query(`
        SELECT id_usuario, nombre_completo, correo, rol
        FROM dbo.usuario
        WHERE correo = @correo
          AND contrasena_hash = CONVERT(varchar(64), HASHBYTES('SHA2_256', @pwd), 2)
          AND activo = 1;
      `);

    if (result.recordset.length > 0) {
      const u = result.recordset[0];
      context.res = {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { ok: true, message: 'Inicio de sesión exitoso', email: u.correo, role: u.rol }
      };
    } else {
      context.res = {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: { ok: false, message: 'Correo o contraseña inválidos' }
      };
    }
  } catch (err) {
    context.log.error('DB error:', err);
    context.res = {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: { ok: false, message: 'Error interno en el servidor' }
    };
  }
};
