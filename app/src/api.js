// app/src/api.js
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

  // Intenta leer el JSON (aunque no sea 200)
  const data = await r.json().catch(() => ({}));

  if (!r.ok) {
    throw new Error(data?.message || 'Error al iniciar sesión');
  }

  // Esperamos { ok, message, email, role }
  if (data?.ok) {
    localStorage.setItem('logged', 'true');
    localStorage.setItem('userEmail', data.email || '');
    localStorage.setItem('userRole', data.role || 'user');
  }

  return data;
}

// Helpers para leer/limpiar sesión/rol
export function getUserRole() {
  return localStorage.getItem('userRole') || 'user';
}

export function getUserEmail() {
  return localStorage.getItem('userEmail') || '';
}

export function isLogged() {
  return localStorage.getItem('logged') === 'true';
}

export function logout() {
  localStorage.clear();
}
