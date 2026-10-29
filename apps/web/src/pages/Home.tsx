import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

// Telas provisórias: as Fases 2 em diante preenchem estas áreas.
export default function Home({ kind }: { kind: 'instructor' | 'student' }) {
  const { user, logout } = useAuth();

  return (
    <div className="shell">
      <header className="topbar">
        <strong>Playground</strong>
        <span className="spacer" />
        <span>
          {user?.name} · {kind === 'instructor' ? 'Instrutor' : 'Aluno'}
        </span>
        <Link to="/trocar-senha">Trocar senha</Link>
        <button type="button" className="link" onClick={logout}>
          Sair
        </button>
      </header>

      <main className="content">
        <h1>{kind === 'instructor' ? 'Painel do instrutor' : 'Minhas atividades'}</h1>
        <p className="hint">
          {kind === 'instructor'
            ? 'Em breve: turmas, importação de alunos, atividades e métricas.'
            : 'Em breve: atividades abertas e concluídas, ranking e feedback.'}
        </p>
      </main>
    </div>
  );
}
