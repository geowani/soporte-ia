// api/Login/index.js
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

  // ---- Usuarios mock con roles ----
  const users = [
    { email: 'demo@empresa.com',  password: '123456', role: 'user'  },
    { email: 'admin@empresa.com', password: '123456', role: 'admin' }
  ];

  const user = users.find(u => u.email === email && u.password === password);

  if (user) {
    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        ok: true,
        message: 'Inicio de sesión exitoso',
        email: user.email,
        role: user.role
      }
    };
  } else {
    context.res = {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
      body: { ok: false, message: 'Correo o contraseña inválidos' }
    };
  }
};
