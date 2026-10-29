import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import BrandLogo from '../../components/BrandLogo';

const tab = ({ isActive }: { isActive: boolean }) => (isActive ? 'tab active' : 'tab');

export default function StudentLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/aluno" className="brand">
          <BrandLogo variant="compact" onDark />
        </Link>
        <span className="spacer" />
        <span>{user?.name} · Aluno</span>
        <Link to="/trocar-senha">Trocar senha</Link>
        <button type="button" className="link" onClick={logout}>
          Sair
        </button>
      </header>

      <nav className="tabs" aria-label="Seções">
        <NavLink to="/aluno" end className={tab}>
          Abertas
        </NavLink>
        <NavLink to="/aluno/concluidas" className={tab}>
          Concluídas
        </NavLink>
        <NavLink to="/aluno/ranking" className={tab}>
          Ranking
        </NavLink>
      </nav>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
