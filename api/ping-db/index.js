const { getPool } = require('../_db');
module.exports = async function (context, req) {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT DB_NAME() db_name,
             CONVERT(sysname, SERVERPROPERTY('ServerName')) server_name,
             SUSER_SNAME() login_name,
             SYSDATETIME() now_utc
    `);
    context.res = { status: 200, body: { env: {
      DB_SERVER: process.env.DB_SERVER, DB_NAME: process.env.DB_NAME
    }, info: r.recordset[0] } };
  } catch (e) {
    context.log.error(e);
    context.res = { status: 500, body: { error: String(e) } };
  }
};
