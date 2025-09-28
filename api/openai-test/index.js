module.exports = async function (context, req) {
  try {
    const key = (process.env.OPENAI_API_KEY || '').trim();
    if (!key) {
      context.res = { status: 200, body: { ok: false, error: 'OPENAI_API_KEY vacío' } };
      return;
    }
    const r = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    const txt = await r.text();
    context.res = { status: 200, body: { ok: r.ok, status: r.status, body: txt.slice(0, 500) } };
  } catch (e) {
    context.res = { status: 200, body: { ok: false, error: String(e?.message || e) } };
  }
};
