module.exports = async function (context, req) {
  const hasSql = Boolean(process.env.SQL_CONN || process.env.DB_CONN);
  const payload = { ok: true, hasSql };

  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload)
  };
};
