// src/pages/sugerencias.jsx
import React, { useEffect, useState } from 'react';

// etiqueta legible para la UI
const ESTADO_LABEL = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada'
};

// intenta varias fuentes para el id del agente
function getAgentId() {
  // 1) localStorage.agentId directo
  const a = localStorage.getItem('agentId');
  if (a && Number(a) > 0) return Number(a);

  // 2) objeto guardado por el login (ajusta si usas otro nombre/campos)
  try {
    const raw = localStorage.getItem('user') || localStorage.getItem('usuario') || '';
    if (raw) {
      const u = JSON.parse(raw);
      const cands = [u.id, u.agente_id, u.id_usuario, u.userId, u.agentId];
      for (const v of cands) {
        const n = Number(v);
        if (Number.isInteger(n) && n > 0) return n;
      }
    }
  } catch {}

  // 3) cookie agent_id
  const m = document.cookie.match(/(?:^|;\s*)agent_id=(\d+)/);
  if (m && Number(m[1]) > 0) return Number(m[1]);

  // 4) nada
  return 0;
}

export default function SugerenciasPage() {
  const [term, setTerm] = useState('');
  const [top, setTop] = useState(20);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // SOLO el número de caso (tu UI no pide más)
  const [numeroCaso, setNumeroCaso] = useState('');

  async function listar() {
    try {
      setLoading(true);
      setErr('');
      const url = `/api/sugerencias?term=${encodeURIComponent(term)}&top=${encodeURIComponent(top)}`;
      const res = await fetch(url);
      const txt = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status} - ${txt}`);
      const data = txt ? JSON.parse(txt) : [];
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr('No se pudo cargar la lista');
    } finally {
      setLoading(false);
    }
  }

  async function crear(e) {
    e?.preventDefault?.();
    setErr('');

    const payload = { numeroCaso: String(numeroCaso || '').trim() };
    if (!payload.numeroCaso) {
      setErr('Ingresa el número de caso');
      return;
    }

    // detecta agente y envíalo por header (el backend ya lo soporta)
    const agentId = getAgentId();

    try {
      const res = await fetch('/api/sugerencias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-id': String(agentId || '')
        },
        body: JSON.stringify(payload)
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status} - ${txt}`);
      setNumeroCaso('');
      await listar();
      alert('¡Sugerencia enviada!');
    } catch (e) {
      console.error(e);
      setErr('No se pudo crear la sugerencia');
      alert(String(e));
    }
  }

  async function actualizarEstado(id, nuevoEstado, nuevasNotas) {
    try {
      setErr('');
      const res = await fetch(`/api/sugerencias/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: String(nuevoEstado).toLowerCase(), // pending/approved/rejected
          ...(nuevasNotas ? { notas: nuevasNotas } : {})
        })
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status} - ${txt}`);
      await listar();
    } catch (e) {
      console.error(e);
      setErr('No se pudo actualizar el estado');
      alert(String(e));
    }
  }

  useEffect(() => { listar(); }, []);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <h2>Sugerencias</h2>

      {/* buscador */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <input
          placeholder="Buscar por número de caso o notas…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <input
          type="number"
          min={1}
          max={50}
          value={top}
          onChange={(e) => setTop(parseInt(e.target.value || '20', 10))}
          style={{ width: 80 }}
          title="TOP N"
        />
        <button onClick={listar}>Buscar</button>
      </div>

      {/* formulario: solo número de caso */}
      <form onSubmit={crear} style={{ display: 'grid', gap: 8, marginBottom: 24 }}>
        <h3>Crear sugerencia</h3>
        <input
          id="numeroCaso"
          name="numeroCaso"
          placeholder="Número de caso"
          value={numeroCaso}
          onChange={(e) => setNumeroCaso(e.target.value)}
          required
        />
        <button id="btnEnviar" type="submit">Enviar</button>
      </form>

      {loading && <div>Cargando…</div>}
      {err && <div style={{ color: 'crimson' }}>{err}</div>}

      {/* listado */}
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12 }}>
        {items.map((sug) => (
          <li key={sug.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <strong>#{sug.id} · Caso: {sug.numeroCaso}</strong>
              <small>{new Date(sug.creadoEn).toLocaleString()}</small>
            </div>
            <div style={{ marginTop: 4 }}>
              <b>Agente:</b> {sug.agenteId} · <b>Estado:</b> {ESTADO_LABEL[sug.estado] || sug.estado}
            </div>
            {sug.notas && <div style={{ marginTop: 4 }}>{sug.notas}</div>}

            {/* acciones: usa los 3 estados válidos del CHECK */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {sug.estado !== 'approved' && (
                <button onClick={() => actualizarEstado(sug.id, 'approved')}>Aprobar</button>
              )}
              {sug.estado !== 'rejected' && (
                <button onClick={() => actualizarEstado(sug.id, 'rejected')}>Rechazar</button>
              )}
              {sug.estado !== 'pending' && (
                <button onClick={() => actualizarEstado(sug.id, 'pending')}>Marcar pendiente</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
