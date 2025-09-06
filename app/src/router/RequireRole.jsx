// src/router/RequireRole.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { getUser } from '../lib/session';

export default function RequireRole({ roles = [], children }) {
  const location = useLocation();
  const u = getUser();
  if (!u) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  const role = (u.rol || u.role || '').toString().toLowerCase();
  const allow = roles.map(r => r.toLowerCase());
  if (!allow.includes(role)) {
    // usuario válido, pero no tiene el rol requerido
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
