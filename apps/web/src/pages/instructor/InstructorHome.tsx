import { Link } from 'react-router-dom';
import { useTeams } from './TeamsContext';

export default function InstructorHome() {
  const { teams, loading } = useTeams();

  return (
    <>
      <h1>Painel do instrutor</h1>
      {loading ? null : teams.length === 0 ? (
        <p className="hint">Comece criando uma turma pelo botão "+ Nova" na barra lateral. Depois, importe os alunos.</p>
      ) : (
        <>
          <p className="hint">Escolha uma turma para ver os alunos e importar novos.</p>
          <ul className="plain-list">
            {teams.map((t) => (
              <li key={t.id}>
                <Link to={`/instrutor/turmas/${t.id}`}>{t.name}</Link>{' '}
                <span className="hint">
                  {t.shift ? `${t.shift} · ` : ''}
                  {t.studentCount} {t.studentCount === 1 ? 'aluno' : 'alunos'}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="hint">Em breve: atividades e métricas.</p>
    </>
  );
}
