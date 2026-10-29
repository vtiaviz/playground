import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import TeamFormModal from './TeamFormModal';
import { TeamsProvider, useTeams } from './TeamsContext';
import BrandLogo from '../../components/BrandLogo';

function Shell() {
  const { user, logout } = useAuth();
  const { teams, loading, error, refresh } = useTeams();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/instrutor" className="brand">
          <BrandLogo variant="compact" onDark />
        </Link>
        <span className="spacer" />
        <span>{user?.name} · Instrutor</span>
        <Link to="/trocar-senha">Trocar senha</Link>
        <button type="button" className="link" onClick={logout}>
          Sair
        </button>
      </header>

      <div className="layout">
        <aside className="sidebar" aria-label="Turmas">
          <div className="sidebar-head">
            <h2>Turmas</h2>
            <button type="button" onClick={() => setCreating(true)}>
              + Nova
            </button>
          </div>

          {loading && <p className="hint">Carregando…</p>}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {!loading && !error && teams.length === 0 && <p className="hint">Nenhuma turma ainda. Crie a primeira!</p>}

          <nav>
            {teams.map((t) => (
              <NavLink key={t.id} to={`/instrutor/turmas/${t.id}`} className={({ isActive }) => (isActive ? 'team-link active' : 'team-link')}>
                <span className="team-name">{t.name}</span>
                <span className="team-meta">
                  {t.shift ? `${t.shift} · ` : ''}
                  {t.studentCount} {t.studentCount === 1 ? 'aluno' : 'alunos'}
                </span>
              </NavLink>
            ))}
          </nav>

          <nav className="sidebar-tools" aria-label="Ferramentas">
            <NavLink to="/instrutor" end className={({ isActive }) => (isActive ? 'team-link active' : 'team-link')}>
              <span className="team-name">📊 Painel</span>
            </NavLink>
            <NavLink to="/instrutor/atividades" className={({ isActive }) => (isActive ? 'team-link active' : 'team-link')}>
              <span className="team-name">📝 Atividades</span>
            </NavLink>
            <NavLink to="/instrutor/jogos" className={({ isActive }) => (isActive ? 'team-link active' : 'team-link')}>
              <span className="team-name">🎮 Meus jogos</span>
            </NavLink>
            <NavLink to="/instrutor/niveis" className={({ isActive }) => (isActive ? 'team-link active' : 'team-link')}>
              <span className="team-name">🎯 Níveis dos alunos</span>
            </NavLink>
            <NavLink to="/instrutor/office" className={({ isActive }) => (isActive ? 'team-link active' : 'team-link')}>
              <span className="team-name">🏢 Office (teste)</span>
            </NavLink>
          </nav>
        </aside>

        <main className="content">
          <Outlet />
        </main>
      </div>

      {creating && (
        <TeamFormModal
          onClose={() => setCreating(false)}
          onSaved={async (team) => {
            setCreating(false);
            await refresh();
            navigate(`/instrutor/turmas/${team.id}`);
          }}
        />
      )}
    </div>
  );
}

export default function InstructorLayout() {
  return (
    <TeamsProvider>
      <Shell />
    </TeamsProvider>
  );
}
