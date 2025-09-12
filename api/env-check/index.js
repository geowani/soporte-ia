module.exports = async function (context, req) {
  const hasSql = Boolean(process.env.SQL_CONN || process.env.DB_CONN);
  context.res = { status: 200, jsonBody: { ok: true, hasSql } };
};
