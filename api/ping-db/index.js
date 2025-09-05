// /api/ping-db/index.js
const { getPool, cfgFromEnv, missingEnv } = require('../_db');

module.exports = async function (context, req) {
  try {
    const envSnapshot = {
      has_DB_CONN: !!process.env.DB_CONN,
      DB_SERVER: process.env.DB_SERVER || null,
      DB_NAME: process.env.DB_NAME || null,
      DB_USER: process.env.DB_USER ? '(set)' : null,
      DB_PASSWORD: process.env.DB_PASSWORD ? '(set)' : null
    };

    const miss = missingEnv();
    if (miss) {
      context.res = {
        status: 500,
        body: {
          error: `Variables de conexión incompletas: ${miss.join(', ')} (o usa DB_CONN).`,
          env: envSnapshot
        }
      };
      return;
    }

    const cfg = cfgFromEnv();
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT DB_NAME() db_name,
             CONVERT(sysname, SERVERPROPERTY('ServerName')) server_name,
             SUSER_SNAME() login_name,
             SYSDATETIME() now_utc
    `);

    context.res = { status: 200, body: { env: envSnapshot, configKind: (cfg.connectionString ? 'connectionString' : 'separateVars'), info: r.recordset[0] } };
  } catch (e) {
    context.log.error(e);
    context.res = { status: 500, body: { error: String(e) } };
  }
};
