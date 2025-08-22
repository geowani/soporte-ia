module.exports = async function (context, req) {
  // Preflight simple
  if (req.method === 'OPTIONS') {
    context.res = { status: 204 };
    return;
  }

  const ct = (req.headers['content-type'] || '').toLowerCase();
  let email = '', password = '';

  try {
    if (ct.includes('application/json')) {
      const body = req.body || {};
      email = (body.email || '').toLowerCase().trim();
      password = body.password || '';
    } else if (ct.includes('application/x-www-form-urlencoded')) {
      const p = new URLSearchParams(req.body || '');
      email = (p.get('email') || '').toLowerCase().trim();
      password = p.get('password') || '';
    }
  } catch (e) { /* ignore parse errors */ }

  // Credenciales de prueba
  const OK_EMAIL = 'demo@empresa.com';
  const OK_PASS  = '123456';

  if (email === OK_EMAIL && password === OK_PASS) {
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { ok: true, message: "Inicio de sesión exitoso" }
    };
  } else {
    context.res = {
      status: 401,
      headers: { "Content-Type": "application/json" },
      body: { ok: false, message: "Correo o contraseña inválidos" }
    };
  }
};
