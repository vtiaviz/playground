import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../api';
import { homeFor, useAuth } from '../auth/AuthContext';
import BrandLogo from '../components/BrandLogo';

// Mesmas regras da API (a API é quem decide; isto só evita uma ida ao servidor)
function validate(next: string, confirm: string, current: string): string {
  if (next.length < 8) return 'A nova senha precisa ter ao menos 8 caracteres.';
  if (!/[A-Za-z]/.test(next)) return 'A nova senha precisa ter ao menos uma letra.';
  if (!/[0-9]/.test(next)) return 'A nova senha precisa ter ao menos um número.';
  if (next === current) return 'A nova senha precisa ser diferente da atual.';
  if (next !== confirm) return 'A confirmação não confere com a nova senha.';
  return '';
}

export default function ChangePassword() {
  const { user, loading, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <p className="center-note">Carregando…</p>;
  if (!user) return <Navigate to="/login" replace />;

  const first = user.mustChangePassword;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validate(next, confirm, current);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setBusy(true);
    try {
      const u = await changePassword(current, next);
      navigate(homeFor(u), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-logo">
        <BrandLogo />
      </div>
      <form className="card" onSubmit={onSubmit}>
        <h1>{first ? 'Crie sua nova senha' : 'Trocar senha'}</h1>
        {first && (
          <p className="hint">
            Olá, {user.name}! Este é seu primeiro acesso: troque a senha temporária para continuar.
          </p>
        )}

        <label>
          {first ? 'Senha temporária (atual)' : 'Senha atual'}
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            autoFocus
            required
          />
        </label>

        <label>
          Nova senha
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            required
          />
          <small>Mínimo de 8 caracteres, com letras e números.</small>
        </label>

        <label>
          Confirmar nova senha
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar nova senha'}
        </button>

        {first ? (
          <button type="button" className="link" onClick={logout}>
            Sair
          </button>
        ) : (
          <Link to={homeFor(user)} className="link">
            Cancelar
          </Link>
        )}
      </form>
    </main>
  );
}
