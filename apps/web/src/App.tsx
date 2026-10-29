import { Navigate, Route, Routes } from 'react-router-dom';
import { homeFor, useAuth } from './auth/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ChangePassword from './pages/ChangePassword';
import Login from './pages/Login';
import ActivitiesPage from './pages/instructor/ActivitiesPage';
import ActivityEditorPage from './pages/instructor/ActivityEditorPage';
import GamesPage from './pages/instructor/GamesPage';
import LevelsPage from './pages/instructor/LevelsPage';
import OfficePage from './pages/instructor/OfficePage';
import DashboardPage from './pages/instructor/DashboardPage';
import InstructorLayout from './pages/instructor/InstructorLayout';
import TeamPage from './pages/instructor/TeamPage';
import RankingPage from './pages/student/RankingPage';
import StudentActivities from './pages/student/StudentActivities';
import StudentActivityPage from './pages/student/StudentActivityPage';
import StudentLayout from './pages/student/StudentLayout';

function Root() {
  const { user, loading } = useAuth();
  if (loading) return <p className="center-note">Carregando…</p>;
  return <Navigate to={user ? homeFor(user) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Root />} />
      <Route path="/login" element={<Login />} />
      <Route path="/trocar-senha" element={<ChangePassword />} />
      <Route
        path="/instrutor"
        element={
          <ProtectedRoute role="INSTRUCTOR">
            <InstructorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="turmas/:id" element={<TeamPage />} />
        <Route path="atividades" element={<ActivitiesPage />} />
        <Route path="atividades/:id" element={<ActivityEditorPage />} />
        <Route path="jogos" element={<GamesPage />} />
        <Route path="niveis" element={<LevelsPage />} />
        <Route path="office" element={<OfficePage />} />
      </Route>
      <Route
        path="/aluno"
        element={
          <ProtectedRoute role="STUDENT">
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentActivities view="open" />} />
        <Route path="concluidas" element={<StudentActivities view="done" />} />
        <Route path="ranking" element={<RankingPage />} />
        <Route path="atividades/:id" element={<StudentActivityPage />} />
      </Route>
      <Route path="*" element={<Root />} />
    </Routes>
  );
}
