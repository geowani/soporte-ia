export async function ping() {
  const r = await fetch('/api/ping');
  if (!r.ok) throw new Error('API error');
  return r.json();
}
export async function listarCasos() {
  const r = await fetch('/api/casos');
  if (!r.ok) throw new Error('API error');
  return r.json();
}
export async function login(email, password) {
  const r = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(data?.message || 'Error al iniciar sesión');
  }
  return data; // { ok: true, message: '...' }
}

