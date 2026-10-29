import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api } from '../../api';
import type { StudentActivity } from '../../types';

const fmtDate = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export default function StudentActivities({ view }: { view: 'open' | 'done' }) {
  const [items, setItems] = useState<StudentActivity[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setItems(null);
    api<{ activities: StudentActivity[] }>('/student/activities')
      .then((r) => setItems(r.activities))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Erro inesperado.'));
  }, [view]);

  if (error) return <p className="error">{error}</p>;
  if (!items) return <p className="hint">Carregando…</p>;

  const shown = items.filter((a) => (view === 'done' ? a.done : !a.done));
  const total = items.reduce((s, a) => s + a.score, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{view === 'open' ? 'Atividades abertas' : 'Atividades concluídas'}</h1>
          <p className="hint">Você tem {total} {total === 1 ? 'ponto' : 'pontos'} acumulados.</p>
        </div>
      </div>

      {shown.length === 0 && (
        <section className="panel">
          <p className="hint">
            {view === 'open'
              ? items.length === 0
                ? 'Nenhuma atividade foi publicada para a sua turma ainda.'
                : 'Tudo em dia! Você não tem atividades abertas. 🎉'
              : 'Você ainda não concluiu nenhuma atividade.'}
          </p>
        </section>
      )}

      <div className="activity-cards">
        {shown.map((a) => {
          const late = !a.done && a.dueAt !== null && new Date(a.dueAt) < new Date();
          const pct = a.gameCount ? Math.round((a.playedCount / a.gameCount) * 100) : a.done ? 100 : 0;
          return (
            <Link key={a.id} to={`/aluno/atividades/${a.id}`} className="activity-card">
              <div className="activity-card-head">
                <strong>{a.title}</strong>
                {late && <span className="badge warn">Prazo vencido</span>}
                {a.done && <span className="badge ok">Concluída</span>}
              </div>
              <div className="hint">
                {a.dueAt ? `Prazo: ${fmtDate(a.dueAt)}` : 'Sem prazo'}
                {a.gameCount > 0 && ` · ${a.playedCount}/${a.gameCount} ${a.gameCount === 1 ? 'jogo' : 'jogos'}`}
                {a.gameCount > 0 && ` · ${a.score}/${a.maxScore} pontos`}
              </div>
              <div className="progress" aria-hidden="true">
                <div style={{ width: `${pct}%` }} />
              </div>
              <span className="activity-card-cta">{a.done ? 'Rever' : a.playedCount > 0 ? 'Continuar' : 'Começar'} →</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
