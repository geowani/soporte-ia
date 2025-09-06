// api/login-post/index.js
const { getPool, sql } = require('../_db');

module.exports = async function (context, req) {
  try {
    const { correo, password } = req.body || {};
    if (!correo || !password) {
      context.res = { status: 400, body: { error: 'correo y password son requeridos' } };
      return;
    }

    const pool = await getPool();

    // 1) Busca al usuario por correo y activo
    const rs = await pool.request()
      .input('correo', sql.NVarChar(256), String(correo).toLowerCase().trim())
      .query(`
        SELECT TOP 1 id_usuario, nombre_completo, correo, contrasena_hash, rol, activo
        FROM dbo.usuario
        WHERE LOWER(LTRIM(RTRIM(correo))) = @correo AND activo = 1
      `);

    if (!rs.recordset.length) {
      context.res = { status: 401, body: { error: 'Credenciales inválidas' } };
      return;
    }

    const u = rs.recordset[0];

    // 2) Verifica la contraseña (ajusta al método que usaste al guardar)
    //    Si ya envías el hash desde el front, compara contra u.contrasena_hash.
    //    Si envías la contraseña en claro, aquí hasheas igual que cuando la guardaste.
    const ok = true; // TODO: reemplaza con tu verificación real
    if (!ok) {
      context.res = { status: 401, body: { error: 'Credenciales inválidas' } };
      return;
    }

    // 3) Devuelve lo mínimo necesario
    const user = {
      id_usuario: u.id_usuario,
      correo: u.correo,
      nombre_completo: u.nombre_completo,
      rol: u.rol
    };

    // (opcional) cookie útil para debugging/compatibilidad
    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `user_email=${encodeURIComponent(user.correo)}; Path=/; SameSite=Lax; Secure; Max-Age=2592000`
      },
      body: user
    };
  } catch (e) {
    context.log.error(e);
    context.res = { status: 500, body: { error: 'Error en login' } };
  }
};
