import { useState, type CSSProperties, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../api';
import { homeFor, useAuth } from '../auth/AuthContext';
import BrandLogo from '../components/BrandLogo';

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <p className="center-note">Carregando…</p>;
  if (user) return <Navigate to={homeFor(user)} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await login(loginValue, password);
      navigate(homeFor(u), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-split">
      <section className="auth-brand">
        <BrandLogo onDark />
        <ul className="auth-roles">
          <li style={{ '--c': 'var(--dot-blue)' } as CSSProperties}>
            <span><strong>Professores</strong>Criem atividades com quiz, caça-palavras, forca e cruzadas.</span>
          </li>
          <li style={{ '--c': 'var(--amber)' } as CSSProperties}>
            <span><strong>Alunos</strong>Joguem, ganhem pontos e acompanhem o ranking da turma.</span>
          </li>
        </ul>
      </section>
      <div className="auth-form">
      <form className="card" onSubmit={onSubmit}>
        <h1>Entrar</h1>

        <label>
          E-mail ou matrícula
          <input
            value={loginValue}
            onChange={(e) => setLoginValue(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </label>

        <label>
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      </div>
    </main>
  );
}
