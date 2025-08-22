app.http('login', {
  methods: ['POST'],
  route: 'login',
  authLevel: 'anonymous',
  handler: async (req, ctx) => {
    try {
      const body = await req.json(); // { email, password }
      const email = (body?.email || '').toLowerCase().trim();
      const password = body?.password || '';

      // Credenciales de prueba (cámbialas si quieres)
      const OK_EMAIL = 'demo@empresa.com';
      const OK_PASS  = '123456';

      if (email === OK_EMAIL && password === OK_PASS) {
        return { status: 200, jsonBody: { ok: true, message: 'Inicio de sesión exitoso' } };
      } else {
        return { status: 401, jsonBody: { ok: false, message: 'Correo o contraseña inválidos' } };
      }
    } catch (e) {
      ctx.log.error(e);
      return { status: 400, jsonBody: { ok: false, message: 'Solicitud inválida' } };
    }
  }
});
