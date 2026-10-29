import { useEffect, useMemo, useState } from 'react';
import { getGame, isGameType } from '@playground/games';
import { ApiError, api } from '../../api';
import { ChartCard, HBarChart, StackedBars, StatTile, fmtNum, fmtPct } from '../../components/charts';
import Modal from '../../components/Modal';
import Stars from '../../components/Stars';
import type { ActivityDelivery, DashboardOverview, DeliveryStatus, StudentCard } from '../../types';
import { useTeams } from './TeamsContext';
import { StudentLevelsModal } from './LevelsPage';
import LevelBadge, { LEVEL_LABEL } from '../../components/LevelBadge';

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Erro inesperado.');
const gameLabel = (t: string) => (isGameType(t) ? getGame(t).label : t);
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

// Estado sempre com ícone + texto (nunca só cor)
function StatusBadge({ status }: { status: DeliveryStatus }) {
  if (status === 'DONE') return <span className="badge ok">✔ Concluída</span>;
  if (status === 'IN_PROGRESS') return <span className="badge info">◐ Em andamento</span>;
  return <span className="badge warn">⚠ Pendente</span>;
}

const STATUS_NAMES = ['Concluídas', 'Em andamento', 'Pendentes'];
const stackSegments = (c: { done: number; inProgress: number; pending: number }) => [
  { name: STATUS_NAMES[0], value: c.done },
  { name: STATUS_NAMES[1], value: c.inProgress },
  { name: STATUS_NAMES[2], value: c.pending },
];

// ---------- ficha do aluno ----------

function StudentModal({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const [card, setCard] = useState<StudentCard | null>(null);
  const [error, setError] = useState('');
  const [levels, setLevels] = useState(false);
  useEffect(() => {
    api<StudentCard>(`/dashboard/students/${studentId}`).then(setCard).catch((e) => setError(errMsg(e)));
  }, [studentId]);

  return (
    <Modal title={card ? card.student.name : 'Aluno'} onClose={onClose} wide>
      {error && <p className="error">{error}</p>}
      {!card && !error && <p className="hint">Carregando…</p>}
      {card && (
        <>
          <p className="hint">
            {card.student.teams.join(', ')} · {card.student.total} pontos · acertos {fmtPct(card.student.avgScorePct)} · {card.student.done}/
            {card.student.assigned} atividades concluídas{' '}
            <button type="button" className="secondary small" onClick={() => setLevels(true)}>
              🎯 Níveis e desempenho
            </button>
          </p>
          {levels && <StudentLevelsModal studentId={studentId} onClose={() => setLevels(false)} />}
          {card.activities.length === 0 ? (
            <p className="hint">Nenhuma atividade publicada para este aluno.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Atividade</th>
                    <th>Situação</th>
                    <th>Jogos</th>
                    <th>Pontos</th>
                    <th>Acertos</th>
                    <th>Última jogada</th>
                    <th>Avaliação</th>
                  </tr>
                </thead>
                <tbody>
                  {card.activities.map((a) => (
                    <tr key={a.activityId} className={a.status === 'PENDING' ? 'row-pending' : undefined}>
                      <td>{a.title}</td>
                      <td>
                        <StatusBadge status={a.status} />
                      </td>
                      <td>
                        {a.played}/{a.gameCount}
                      </td>
                      <td>{a.score}</td>
                      <td>{fmtPct(a.avgScorePct)}</td>
                      <td>{fmtDate(a.lastAt)}</td>
                      <td>{a.rating ? <Stars value={a.rating} /> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

// ---------- status de entrega de uma atividade ----------

function DeliverySection({ activities, onStudent }: { activities: DashboardOverview['activities']; onStudent: (id: string) => void }) {
  const [activityId, setActivityId] = useState(activities[0]?.id ?? '');
  const [data, setData] = useState<ActivityDelivery | null>(null);
  const [error, setError] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);

  // se a lista mudar (filtro de turma), mantém a atividade escolhida quando ela ainda existe
  useEffect(() => {
    if (!activities.some((a) => a.id === activityId)) setActivityId(activities[0]?.id ?? '');
  }, [activities, activityId]);

  useEffect(() => {
    if (!activityId) {
      setData(null);
      return;
    }
    setError('');
    api<ActivityDelivery>(`/dashboard/activities/${activityId}`).then(setData).catch((e) => setError(errMsg(e)));
  }, [activityId]);

  if (activities.length === 0) {
    return (
      <section className="panel">
        <h2>Status de entrega</h2>
        <p className="hint">Publique uma atividade para acompanhar as entregas.</p>
      </section>
    );
  }

  const rows = data ? data.students.filter((s) => !onlyPending || s.status !== 'DONE') : [];
  return (
    <section className="panel viz">
      <div className="viz-head">
        <div>
          <h2>Status de entrega</h2>
          <p className="hint">Quem já fez, quem está no meio e quem ainda não começou (pendentes primeiro).</p>
        </div>
        <div className="actions">
          <label className="inline-label">
            Atividade
            <select value={activityId} onChange={(e) => setActivityId(e.target.value)}>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} /> só quem falta concluir
          </label>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {data && (
        <>
          <StackedBars rows={[{ label: 'Alunos', total: data.counts.total, segments: stackSegments({ done: data.counts.done, inProgress: data.counts.inProgress, pending: data.counts.pending }) }]} />

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Turma</th>
                  <th>Situação</th>
                  <th>Jogos</th>
                  <th>Pontos</th>
                  <th>Acertos</th>
                  <th title="Desempenho médio (0–100): acertos, tempo por item e chutes">Desempenho</th>
                  <th>Última jogada</th>
                  <th>Avaliação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.studentId} className={s.status === 'PENDING' ? 'row-pending' : undefined}>
                    <td>
                      <button type="button" className="link" onClick={() => onStudent(s.studentId)}>
                        {s.name}
                      </button>
                    </td>
                    <td>{s.teams.join(', ')}</td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td>
                      {s.played}/{s.gameCount}
                    </td>
                    <td>{s.score}</td>
                    <td>{fmtPct(s.avgScorePct)}</td>
                    <td>
                      {s.avgPerformance ?? '—'}
                      {s.plays
                        .filter((p) => p.level)
                        .map((p) => (
                          <span key={p.blockId}>
                            {' '}
                            <LevelBadge level={p.level!} title={`Jogou no nível ${LEVEL_LABEL[p.level!]} · desempenho ${p.performance ?? '—'}`} />
                          </span>
                        ))}
                    </td>
                    <td>{fmtDate(s.lastAt)}</td>
                    <td>{s.rating ? <Stars value={s.rating} /> : '—'}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="hint">
                      {data.students.length === 0 ? 'Nenhum aluno nas turmas desta atividade.' : 'Todos os alunos concluíram. 🎉'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data.games.length > 0 && (
            <>
              <h3>Acertos por jogo</h3>
              <HBarChart
                rows={data.games.map((g, i) => ({
                  label: `${i + 1}. ${g.adaptive ? "🎯 " : ""}${g.title}`,
                  value: g.avgScorePct,
                  display: fmtPct(g.avgScorePct),
                  sub: `${gameLabel(g.gameType)} · ${g.plays} ${g.plays === 1 ? 'jogada' : 'jogadas'}${g.avgPerformance !== null ? ` · desempenho ${g.avgPerformance}` : ''}`,
                  detail:
                    g.adaptive && g.byLevel
                      ? [{ value: '🎯', label: `Adaptativo · Fácil ${g.byLevel.easy} · Normal ${g.byLevel.normal} · Difícil ${g.byLevel.hard}` }]
                      : undefined,
                }))}
              />
            </>
          )}
        </>
      )}
    </section>
  );
}

// ---------- página ----------

export default function DashboardPage() {
  const { teams } = useTeams();
  const [teamId, setTeamId] = useState('');
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setLoading(true);
    api<{ overview: DashboardOverview }>(`/dashboard${teamId ? `?teamId=${teamId}` : ''}`)
      .then((r) => {
        setData(r.overview);
        setError('');
      })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [teamId]);

  const o = data;
  const activityOptions = useMemo(() => o?.activities ?? [], [o]);

  if (error && !o) return <p className="error">{error}</p>;
  if (!o) return <p className="hint">Carregando…</p>;

  const empty = o.kpis.students === 0;
  const ranking = showAll ? o.ranking : o.ranking.slice(0, 10);
  const maxRating = Math.max(1, ...o.satisfaction.distribution.map((d) => d.count));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Painel</h1>
          <p className="hint">Resumo das turmas, atividades e jogos.</p>
        </div>
        <label className="inline-label">
          Turma
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} aria-label="Filtrar por turma">
            <option value="">Todas as turmas</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="error">{error}</p>}

      {empty ? (
        <section className="panel">
          <p className="hint">
            {teams.length === 0
              ? 'Crie uma turma e importe os alunos para começar.'
              : 'Esta seleção ainda não tem alunos. Importe os alunos na página da turma.'}
          </p>
        </section>
      ) : (
        <div className={loading ? 'dash dash-loading' : 'dash'}>
          <div className="stat-row viz">
            <StatTile label="Alunos" value={String(o.kpis.students)} />
            <StatTile label="Atividades publicadas" value={String(o.kpis.activities)} />
            <StatTile
              label="Entregas concluídas"
              value={fmtPct(o.kpis.completionPct)}
              sub={o.kpis.pending > 0 ? `${o.kpis.pending} pendente${o.kpis.pending === 1 ? '' : 's'}` : 'sem pendências'}
            />
            <StatTile label="Média de acertos" value={fmtPct(o.kpis.avgScorePct)} />
            <StatTile
              label="Satisfação"
              value={o.kpis.avgRating === null ? '—' : `${fmtNum(o.kpis.avgRating)} / 5`}
              sub={`${o.kpis.ratingCount} ${o.kpis.ratingCount === 1 ? 'avaliação' : 'avaliações'}`}
            />
          </div>

          <div className="viz-grid">
            <ChartCard
              title="Entrega por atividade"
              subtitle="Alunos que concluíram, estão no meio ou não começaram"
              table={{
                head: ['Atividade', 'Turmas', 'Concluídas', 'Em andamento', 'Pendentes'],
                rows: o.activities.map((a) => [a.title, a.teams.join(', '), a.done, a.inProgress, a.pending]),
              }}
            >
              <StackedBars
                empty="Nenhuma atividade publicada."
                rows={o.activities.map((a) => ({ label: a.title, total: a.total, segments: stackSegments(a) }))}
              />
            </ChartCard>

            <ChartCard
              title="Entrega por turma"
              subtitle="Cada aluno × atividade publicada para a turma"
              table={{
                head: ['Turma', 'Alunos', 'Atividades', 'Concluídas', 'Em andamento', 'Pendentes'],
                rows: o.teams.map((t) => [t.name, t.students, t.activities, t.done, t.inProgress, t.pending]),
              }}
            >
              <StackedBars
                empty="Nenhuma turma."
                rows={o.teams.map((t) => ({ label: t.name, total: t.total, segments: stackSegments(t) }))}
              />
            </ChartCard>

            <ChartCard
              title="Média de acertos por turma"
              subtitle="Pontos obtidos ÷ pontos possíveis nos jogos jogados"
              table={{ head: ['Turma', 'Acertos'], rows: o.teams.map((t) => [t.name, fmtPct(t.avgScorePct)]) }}
            >
              <HBarChart
                rows={o.teams.map((t) => ({
                  label: t.name,
                  value: t.avgScorePct,
                  display: fmtPct(t.avgScorePct),
                  sub: `${t.students} ${t.students === 1 ? 'aluno' : 'alunos'}`,
                }))}
              />
            </ChartCard>

            <ChartCard
              title="Média de acertos por atividade"
              table={{ head: ['Atividade', 'Acertos'], rows: o.activities.map((a) => [a.title, fmtPct(a.avgScorePct)]) }}
            >
              <HBarChart
                empty="Nenhuma atividade publicada."
                rows={o.activities.map((a) => ({
                  label: a.title,
                  value: a.avgScorePct,
                  display: fmtPct(a.avgScorePct),
                  sub: `${a.done}/${a.total} concluíram`,
                }))}
              />
            </ChartCard>

            <ChartCard
              title="Desempenho por jogo"
              subtitle="Média de acertos em cada tipo de jogo"
              table={{ head: ['Jogo', 'Jogadas', 'Acertos'], rows: o.games.map((g) => [gameLabel(g.gameType), g.plays, fmtPct(g.avgScorePct)]) }}
            >
              <HBarChart
                empty="Ninguém jogou ainda."
                rows={o.games.map((g) => ({
                  label: gameLabel(g.gameType),
                  value: g.avgScorePct,
                  display: fmtPct(g.avgScorePct),
                  sub: `${g.plays} ${g.plays === 1 ? 'jogada' : 'jogadas'}`,
                }))}
              />
            </ChartCard>

            <ChartCard
              title="Satisfação"
              subtitle="Avaliações dos alunos (1 a 5 estrelas)"
              table={{ head: ['Estrelas', 'Avaliações'], rows: o.satisfaction.distribution.map((d) => [d.rating, d.count]) }}
            >
              {o.kpis.ratingCount === 0 ? (
                <p className="hint">Nenhuma avaliação ainda.</p>
              ) : (
                <HBarChart
                  max={maxRating}
                  rows={[...o.satisfaction.distribution].reverse().map((d) => ({
                    label: `${d.rating} ${d.rating === 1 ? 'estrela' : 'estrelas'}`,
                    value: d.count,
                    display: String(d.count),
                  }))}
                />
              )}
            </ChartCard>
          </div>

          {o.kpis.ratingCount > 0 && (
            <section className="panel viz">
              <h2>Melhores e piores avaliações</h2>
              <div className="two-col">
                <div>
                  <h3>Mais bem avaliadas</h3>
                  <ol className="plain-ol">
                    {o.satisfaction.best.map((a) => (
                      <li key={a.id}>
                        {a.title} <span className="hint">· {fmtNum(a.avgRating)} ★ ({a.ratingCount})</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3>Para melhorar</h3>
                  <ol className="plain-ol">
                    {o.satisfaction.worst.map((a) => (
                      <li key={a.id}>
                        {a.title} <span className="hint">· {fmtNum(a.avgRating)} ★ ({a.ratingCount})</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              {o.satisfaction.comments.length > 0 && (
                <>
                  <h3>Comentários recentes</h3>
                  <ul className="comments">
                    {o.satisfaction.comments.map((c, i) => (
                      <li key={i}>
                        <Stars value={c.rating} /> <span>{c.comment}</span>
                        <span className="hint">
                          {' '}
                          — {c.student}, {c.activity}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          <DeliverySection activities={activityOptions} onStudent={setStudentId} />

          <section className="panel viz">
            <div className="viz-head">
              <div>
                <h2>Ranking de alunos</h2>
                <p className="hint">Pontos acumulados nas atividades publicadas.</p>
              </div>
              {o.ranking.length > 10 && (
                <button type="button" className="secondary small" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? 'Ver só os 10 primeiros' : `Ver todos (${o.ranking.length})`}
                </button>
              )}
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Aluno</th>
                    <th>Turma</th>
                    <th>Pontos</th>
                    <th>Acertos</th>
                    <th>Atividades concluídas</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r) => (
                    <tr key={r.studentId}>
                      <td>{r.rank}</td>
                      <td>
                        <button type="button" className="link" onClick={() => setStudentId(r.studentId)}>
                          {r.name}
                        </button>
                      </td>
                      <td>{r.teams.join(', ')}</td>
                      <td>{r.total}</td>
                      <td>{fmtPct(r.avgScorePct)}</td>
                      <td>
                        {r.done}/{r.assigned}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {studentId && <StudentModal studentId={studentId} onClose={() => setStudentId(null)} />}
    </>
  );
}
