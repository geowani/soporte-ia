// src/lib/session.js
export function getUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function getRole() {
  const u = getUser();
  const r = (u?.rol || u?.role || '').toString().toLowerCase().trim();
  return r; // p.ej. "admin", "administrador", "user"
}

export function isAdmin() {
  const r = getRole();
  return ['admin', 'administrador', 'superadmin'].includes(r);
}
