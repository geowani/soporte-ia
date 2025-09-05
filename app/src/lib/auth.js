export function syncAgentIdFromUser() {
  try {
    const raw = localStorage.getItem('user') || localStorage.getItem('usuario') || '';
    if (!raw) return;
    const u = JSON.parse(raw);
    const id = Number(u.id_usuario ?? u.id ?? u.agente_id ?? u.userId ?? u.agentId ?? 0);
    if (Number.isInteger(id) && id > 0) {
      localStorage.setItem('agentId', String(id));
      document.cookie = `agent_id=${id}; Path=/; SameSite=Lax; Secure; Max-Age=2592000`;
    }
  } catch {}
}
