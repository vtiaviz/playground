// Cálculo das métricas do painel do instrutor (funções puras: recebem os dados já carregados).
//
// Conceitos:
//  - "entrega" = um aluno × uma atividade publicada para alguma turma dele (conta uma vez, mesmo que o
//    aluno esteja em duas turmas que receberam a mesma atividade);
//  - status: CONCLUÍDA (todos os jogos feitos; atividade só de texto: avaliação enviada),
//    EM ANDAMENTO (alguns jogos) ou PENDENTE (nenhum);
//  - percentual de acerto = soma das notas / soma das notas máximas dos jogos jogados.

export type Status = 'DONE' | 'IN_PROGRESS' | 'PENDING';

export interface DTeam {
  id: string;
  name: string;
  students: { id: string; name: string }[];
  activityIds: string[];
}
export interface DActivity {
  id: string;
  title: string;
  games: { blockId: string; gameType: string }[];
}
export interface DScore {
  studentId: string;
  activityId: string;
  blockId: string;
  gameType: string;
  score: number;
  maxScore: number;
  completedAt: Date;
}
export interface DFeedback {
  studentId: string;
  activityId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

export interface Assignment {
  studentId: string;
  activityId: string;
  teamIds: string[];
  status: Status;
  played: number;
  gameCount: number;
  score: number;
  maxScore: number;
  lastAt: Date | null;
  rating: number | null;
}

const round1 = (x: number) => Math.round(x * 10) / 10;
export const pct = (score: number, max: number): number | null => (max > 0 ? round1((score / max) * 100) : null);
const avg = (xs: number[]): number | null => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const ptSort = (a: string, b: string) => a.localeCompare(b, 'pt-BR');

export function buildAssignments(teams: DTeam[], activities: DActivity[], scores: DScore[], feedbacks: DFeedback[]) {
  const actById = new Map(activities.map((a) => [a.id, a]));
  const keyOf = (s: string, a: string) => `${s}:${a}`;

  const assigned = new Map<string, Set<string>>(); // aluno:atividade -> turmas
  for (const t of teams) {
    for (const aid of t.activityIds) {
      if (!actById.has(aid)) continue;
      for (const s of t.students) {
        const k = keyOf(s.id, aid);
        if (!assigned.has(k)) assigned.set(k, new Set());
        assigned.get(k)!.add(t.id);
      }
    }
  }

  // só valem notas de jogos que ainda existem na atividade e de entregas existentes
  const validScores: DScore[] = [];
  const scoresByKey = new Map<string, DScore[]>();
  for (const sc of scores) {
    const act = actById.get(sc.activityId);
    const k = keyOf(sc.studentId, sc.activityId);
    if (!act || !assigned.has(k) || !act.games.some((g) => g.blockId === sc.blockId)) continue;
    validScores.push(sc);
    if (!scoresByKey.has(k)) scoresByKey.set(k, []);
    scoresByKey.get(k)!.push(sc);
  }
  const fbByKey = new Map(feedbacks.map((f) => [keyOf(f.studentId, f.activityId), f]));

  const assignments: Assignment[] = [];
  for (const [k, teamIds] of assigned) {
    const [studentId, activityId] = k.split(':');
    const act = actById.get(activityId)!;
    const mine = scoresByKey.get(k) ?? [];
    const fb = fbByKey.get(k) ?? null;
    const gameCount = act.games.length;
    const status: Status =
      gameCount === 0
        ? fb
          ? 'DONE'
          : 'PENDING'
        : mine.length >= gameCount
          ? 'DONE'
          : mine.length > 0
            ? 'IN_PROGRESS'
            : 'PENDING';
    assignments.push({
      studentId,
      activityId,
      teamIds: [...teamIds],
      status,
      played: mine.length,
      gameCount,
      score: mine.reduce((s, x) => s + x.score, 0),
      maxScore: mine.reduce((s, x) => s + x.maxScore, 0),
      lastAt: mine.length ? new Date(Math.max(...mine.map((x) => x.completedAt.getTime()))) : null,
      rating: fb ? fb.rating : null,
    });
  }
  return { assignments, validScores };
}

const countStatus = (as: Assignment[]) => ({
  total: as.length,
  done: as.filter((a) => a.status === 'DONE').length,
  inProgress: as.filter((a) => a.status === 'IN_PROGRESS').length,
  pending: as.filter((a) => a.status === 'PENDING').length,
});
const scorePct = (as: Assignment[]) =>
  pct(
    as.reduce((s, a) => s + a.score, 0),
    as.reduce((s, a) => s + a.maxScore, 0),
  );

export function buildOverview(
  teams: DTeam[],
  activities: DActivity[],
  data: { assignments: Assignment[]; validScores: DScore[] },
  feedbacks: DFeedback[],
) {
  const { assignments, validScores } = data;
  const studentIds = new Map<string, string>();
  teams.forEach((t) => t.students.forEach((s) => studentIds.set(s.id, s.name)));

  const st = countStatus(assignments);
  const ratings = assignments.filter((a) => a.rating !== null).map((a) => a.rating as number);

  // por turma (o aluno em duas turmas conta em cada uma)
  const teamRows = teams.map((t) => {
    const mine = assignments.filter((a) => a.teamIds.includes(t.id));
    const c = countStatus(mine);
    return {
      id: t.id,
      name: t.name,
      students: t.students.length,
      activities: t.activityIds.filter((id) => activities.some((a) => a.id === id)).length,
      ...c,
      completionPct: c.total ? round1((c.done / c.total) * 100) : null,
      avgScorePct: scorePct(mine),
    };
  });

  // por atividade
  const activityRows = activities.map((a) => {
    const mine = assignments.filter((x) => x.activityId === a.id);
    const rs = mine.filter((x) => x.rating !== null).map((x) => x.rating as number);
    return {
      id: a.id,
      title: a.title,
      teams: teams.filter((t) => t.activityIds.includes(a.id)).map((t) => t.name).sort(ptSort),
      gameCount: a.games.length,
      ...countStatus(mine),
      avgScorePct: scorePct(mine),
      avgRating: avg(rs),
      ratingCount: rs.length,
    };
  });

  // por tipo de jogo
  const byGame = new Map<string, DScore[]>();
  for (const s of validScores) {
    if (!byGame.has(s.gameType)) byGame.set(s.gameType, []);
    byGame.get(s.gameType)!.push(s);
  }
  const gameRows = [...byGame.entries()]
    .map(([gameType, xs]) => ({
      gameType,
      plays: xs.length,
      avgScorePct: pct(
        xs.reduce((s, x) => s + x.score, 0),
        xs.reduce((s, x) => s + x.maxScore, 0),
      ),
    }))
    .sort((a, b) => b.plays - a.plays);

  // ranking de alunos (pontos acumulados)
  const ranking = [...studentIds.entries()]
    .map(([id, name]) => {
      const mine = assignments.filter((a) => a.studentId === id);
      return {
        studentId: id,
        name,
        teams: teams.filter((t) => t.students.some((s) => s.id === id)).map((t) => t.name).sort(ptSort),
        total: mine.reduce((s, a) => s + a.score, 0),
        done: mine.filter((a) => a.status === 'DONE').length,
        assigned: mine.length,
        avgScorePct: scorePct(mine),
      };
    })
    .sort((a, b) => b.total - a.total || ptSort(a.name, b.name));
  let rank = 0;
  const rankedStudents = ranking.map((r, i) => {
    if (i === 0 || r.total !== ranking[i - 1].total) rank = i + 1;
    return { ...r, rank };
  });

  // satisfação
  const distribution = [1, 2, 3, 4, 5].map((n) => ({ rating: n, count: ratings.filter((r) => r === n).length }));
  const rated = activityRows.filter((a) => a.avgRating !== null);
  const best = [...rated].sort((a, b) => b.avgRating! - a.avgRating! || b.ratingCount - a.ratingCount).slice(0, 3);
  const worst = [...rated].sort((a, b) => a.avgRating! - b.avgRating! || b.ratingCount - a.ratingCount).slice(0, 3);
  const slim = (a: (typeof rated)[number]) => ({ id: a.id, title: a.title, avgRating: a.avgRating, ratingCount: a.ratingCount });

  const titleOf = new Map(activities.map((a) => [a.id, a.title]));
  const assignedKeys = new Set(assignments.map((a) => `${a.studentId}:${a.activityId}`));
  const comments = feedbacks
    .filter((f) => f.comment && assignedKeys.has(`${f.studentId}:${f.activityId}`))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10)
    .map((f) => ({
      activityId: f.activityId,
      activity: titleOf.get(f.activityId) ?? '',
      student: studentIds.get(f.studentId) ?? '',
      rating: f.rating,
      comment: f.comment as string,
    }));

  return {
    kpis: {
      students: studentIds.size,
      activities: activities.length,
      deliveries: st.total,
      completionPct: st.total ? round1((st.done / st.total) * 100) : null,
      pending: st.pending,
      avgScorePct: scorePct(assignments),
      avgRating: avg(ratings),
      ratingCount: ratings.length,
    },
    teams: teamRows.sort((a, b) => ptSort(a.name, b.name)),
    activities: activityRows,
    games: gameRows,
    ranking: rankedStudents,
    satisfaction: { distribution, best: best.map(slim), worst: worst.map(slim), comments },
  };
}
