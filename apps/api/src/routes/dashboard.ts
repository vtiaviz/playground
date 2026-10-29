import { Router } from 'express';
import { z } from 'zod';
import { maxScoreFor, type GameType } from '@playground/games/validate';
import { baseTitle } from '@playground/games/adaptive';
import { prisma } from '../prisma';
import { requireAuth, requirePasswordChanged, requireRole } from '../middleware/auth';
import { gamesIn } from '../lib/content';
import {
  buildAssignments,
  buildOverview,
  pct,
  type DActivity,
  type DTeam,
} from '../lib/dashboard';

export const dashboardRouter = Router();

// Painel exclusivo do instrutor; só enxerga turmas, alunos e atividades dele
dashboardRouter.use(requireAuth, requirePasswordChanged, requireRole('INSTRUCTOR'));

const idSchema = z.string().uuid('Identificador inválido');

// Carrega as turmas do instrutor (ou só uma) com tudo o que as métricas precisam
async function loadScope(instructorId: string, teamId?: string) {
  const rows = await prisma.team.findMany({
    where: { instructorId, ...(teamId ? { id: teamId } : {}) },
    include: {
      students: { include: { student: { select: { id: true, name: true } } } },
      activities: { where: { activity: { publishedAt: { not: null } } }, select: { activityId: true } },
    },
  });
  const teams: DTeam[] = rows.map((t) => ({
    id: t.id,
    name: t.name,
    students: t.students.map((s) => s.student),
    activityIds: t.activities.map((a) => a.activityId),
  }));

  const activityIds = [...new Set(teams.flatMap((t) => t.activityIds))];
  const studentIds = [...new Set(teams.flatMap((t) => t.students.map((s) => s.id)))];

  const [actRows, scores, feedbacks] = await Promise.all([
    prisma.activity.findMany({
      where: { id: { in: activityIds } },
      orderBy: { publishedAt: 'desc' },
      select: { id: true, title: true, contentJson: true, publishedAt: true, dueAt: true },
    }),
    prisma.gameScore.findMany({ where: { activityId: { in: activityIds }, studentId: { in: studentIds } } }),
    prisma.feedback.findMany({ where: { activityId: { in: activityIds }, studentId: { in: studentIds } } }),
  ]);

  const activities: DActivity[] = actRows.map((a) => ({
    id: a.id,
    title: a.title,
    games: gamesIn(a.contentJson).map((g) => ({ blockId: g.blockId, gameType: g.gameType })),
  }));
  const data = buildAssignments(teams, activities, scores, feedbacks);
  return { rows, teams, activities, actRows, scores, feedbacks, data };
}

// Visão geral (todas as turmas ou uma só: ?teamId=)
dashboardRouter.get('/', async (req, res) => {
  const teamId = req.query.teamId ? idSchema.parse(req.query.teamId) : undefined;
  const scope = await loadScope(req.user!.id, teamId);
  if (teamId && scope.teams.length === 0) {
    res.status(404).json({ error: 'Turma não encontrada' });
    return;
  }
  res.json({ overview: buildOverview(scope.teams, scope.activities, scope.data, scope.feedbacks) });
});

// Status de entrega de uma atividade, aluno por aluno, e desempenho por jogo
dashboardRouter.get('/activities/:id', async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const scope = await loadScope(req.user!.id);
  const act = scope.actRows.find((a) => a.id === id);
  if (!act) {
    // não publicada para nenhuma turma dele, ou de outro instrutor
    const own = await prisma.activity.findFirst({ where: { id, instructorId: req.user!.id }, select: { id: true } });
    if (own) {
      res.status(409).json({ error: 'A atividade ainda não foi publicada para nenhuma turma' });
      return;
    }
    res.status(404).json({ error: 'Atividade não encontrada' });
    return;
  }

  const students = new Map<string, string>();
  const teamName = new Map(scope.teams.map((t) => [t.id, t.name]));
  scope.teams.forEach((t) => t.students.forEach((s) => students.set(s.id, s.name)));

  const mine = scope.data.assignments.filter((a) => a.activityId === id);
  // desempenho (0–100) e nível jogado em cada jogo, aluno a aluno
  const blockIds = new Set(gamesIn(act.contentJson).map((g) => g.blockId));
  const perf = scope.scores.filter((s) => s.activityId === id && blockIds.has(s.blockId));
  const perfOf = (studentId: string) => perf.filter((s) => s.studentId === studentId);
  const meanPerf = (xs: { performance: number | null }[]) => {
    const v = xs.map((x) => x.performance).filter((x): x is number => x !== null);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  };
  const statusOrder = { PENDING: 0, IN_PROGRESS: 1, DONE: 2 } as const;
  const rows = mine
    .map((a) => ({
      studentId: a.studentId,
      name: students.get(a.studentId) ?? '',
      teams: a.teamIds.map((t) => teamName.get(t) ?? '').sort((x, y) => x.localeCompare(y, 'pt-BR')),
      status: a.status,
      played: a.played,
      gameCount: a.gameCount,
      score: a.score,
      maxScore: a.maxScore,
      avgScorePct: pct(a.score, a.maxScore),
      lastAt: a.lastAt,
      rating: a.rating,
      avgPerformance: meanPerf(perfOf(a.studentId)),
      plays: perfOf(a.studentId).map((s) => ({ blockId: s.blockId, level: s.level, performance: s.performance })),
    }))
    // pendentes primeiro (é quem o instrutor precisa cobrar), depois por nome
    .sort((x, y) => statusOrder[x.status] - statusOrder[y.status] || x.name.localeCompare(y.name, 'pt-BR'));

  const validScores = scope.data.validScores.filter((s) => s.activityId === id);
  const games = gamesIn(act.contentJson).map((g, i) => {
    const xs = validScores.filter((s) => s.blockId === g.blockId);
    const cfg = g.config as { title?: string } | null;
    const ps = perf.filter((s) => s.blockId === g.blockId && xs.some((x) => x.studentId === s.studentId));
    return {
      blockId: g.blockId,
      gameType: g.gameType,
      adaptive: Boolean(g.levels),
      levelCount: g.levels ? Object.keys(g.levels).length : 0,
      byLevel: g.levels
        ? {
            easy: ps.filter((s) => s.level === 'easy').length,
            normal: ps.filter((s) => s.level === 'normal').length,
            hard: ps.filter((s) => s.level === 'hard').length,
          }
        : null,
      avgPerformance: meanPerf(ps),
      title: g.levels && cfg?.title ? baseTitle(cfg.title) : (cfg?.title ?? `Jogo ${i + 1}`),
      maxScore: maxScoreFor(g.gameType as GameType, g.config),
      plays: xs.length,
      avgScorePct: pct(
        xs.reduce((s, x) => s + x.score, 0),
        xs.reduce((s, x) => s + x.maxScore, 0),
      ),
    };
  });

  const fbs = scope.feedbacks
    .filter((f) => f.activityId === id && mine.some((a) => a.studentId === f.studentId))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((f) => ({ student: students.get(f.studentId) ?? '', rating: f.rating, comment: f.comment }));

  res.json({
    activity: { id: act.id, title: act.title, publishedAt: act.publishedAt, dueAt: act.dueAt, gameCount: games.length },
    counts: {
      total: rows.length,
      done: rows.filter((r) => r.status === 'DONE').length,
      inProgress: rows.filter((r) => r.status === 'IN_PROGRESS').length,
      pending: rows.filter((r) => r.status === 'PENDING').length,
    },
    students: rows,
    games,
    feedbacks: fbs,
  });
});

// Ficha de um aluno (só alunos das turmas do instrutor)
dashboardRouter.get('/students/:id', async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const scope = await loadScope(req.user!.id);
  const student = scope.teams.flatMap((t) => t.students).find((s) => s.id === id);
  if (!student) {
    res.status(404).json({ error: 'Aluno não encontrado' });
    return;
  }
  const titleOf = new Map(scope.activities.map((a) => [a.id, a.title]));
  const dueOf = new Map(scope.actRows.map((a) => [a.id, a.dueAt]));
  const mine = scope.data.assignments
    .filter((a) => a.studentId === id)
    .map((a) => ({
      activityId: a.activityId,
      title: titleOf.get(a.activityId) ?? '',
      dueAt: dueOf.get(a.activityId) ?? null,
      status: a.status,
      played: a.played,
      gameCount: a.gameCount,
      score: a.score,
      maxScore: a.maxScore,
      avgScorePct: pct(a.score, a.maxScore),
      lastAt: a.lastAt,
      rating: a.rating,
    }));
  const overview = buildOverview(
    scope.teams.filter((t) => t.students.some((s) => s.id === id)),
    scope.activities,
    {
      assignments: scope.data.assignments.filter((a) => a.studentId === id),
      validScores: scope.data.validScores.filter((s) => s.studentId === id),
    },
    scope.feedbacks.filter((f) => f.studentId === id),
  );
  const me = overview.ranking.find((r) => r.studentId === id);
  res.json({
    student: {
      id,
      name: student.name,
      teams: scope.teams.filter((t) => t.students.some((s) => s.id === id)).map((t) => t.name),
      total: me?.total ?? 0,
      avgScorePct: me?.avgScorePct ?? null,
      done: me?.done ?? 0,
      assigned: me?.assigned ?? 0,
    },
    activities: mine,
    games: overview.games,
  });
});
