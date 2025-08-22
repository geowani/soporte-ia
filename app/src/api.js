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
