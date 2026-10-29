import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { homeFor, useAuth, type Role } from '../auth/AuthContext';

// Regras, nesta ordem: precisa estar logado -> precisa já ter trocado a senha -> precisa ter o papel certo.
export default function ProtectedRoute({ role, children }: { role?: Role; children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <p className="center-note">Carregando…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/trocar-senha" replace />;
  if (role && user.role !== role) return <Navigate to={homeFor(user)} replace />;

  return <>{children}</>;
}
