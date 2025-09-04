const sql = require('mssql');

const config = {
  user: process.env.SQLUSER,
  password: process.env.SQLPASS,
  server: process.env.SQLSERVER,
  database: process.env.SQLDB,
  options: { encrypt: true, trustServerCertificate: false }
};

module.exports = async function (context, req) {
  try {
    const pool = await sql.connect(config);
    const r1 = await pool.request().query('SELECT 1 AS ok');
    const r2 = await pool.request().query('SELECT COUNT(*) AS usuarios FROM dbo.usuario');
    context.res = { status: 200, body: {
      ok: true,
      sqlserver: process.env.SQLSERVER,
      db: process.env.SQLDB,
      ping: r1.recordset[0],
      usuarios: r2.recordset[0].usuarios
    }};
  } catch (e) {
    context.log.error(e);
    context.res = { status: 500, body: { ok:false, error: e.message } };
  }
};
