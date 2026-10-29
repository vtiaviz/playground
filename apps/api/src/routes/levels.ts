import { Router } from 'express';
import { z } from 'zod';
import type { GameType, Level } from '@prisma/client';
import { GAME_TYPES } from '@playground/games/validate';
import { LEVELS, initialLevel } from '@playground/games/adaptive';
import { prisma } from '../prisma';
import { requireAuth, requirePasswordChanged, requireRole } from '../middleware/auth';

// Aprendizado personalizado (instrutor): nível de cada aluno em cada tipo de jogo, histórico e
// ajuste manual. Só alunos das turmas do instrutor.
export const levelsRouter = Router();
levelsRouter.use(requireAuth, requirePasswordChanged, requireRole('INSTRUCTOR'));

const idSchema = z.string().uuid('Identificador inválido');
const gameTypeSchema = z.enum(GAME_TYPES, { errorMap: () => ({ message: 'Tipo de jogo inválido' }) });
const levelSchema = z.enum(LEVELS, { errorMap: () => ({ message: 'Nível inválido' }) });
const updateSchema = z
  .object({ level: levelSchema.optional(), locked: z.boolean().optional() })
  .refine((b) => b.level !== undefined || b.locked !== undefined, { message: 'Informe o nível ou o bloqueio' });

const RECENT = 5; // partidas usadas na média de desempenho

async function studentsInScope(instructorId: string, teamId?: string) {
  const teams = await prisma.team.findMany({
    where: { instructorId, ...(teamId ? { id: teamId } : {}) },
    orderBy: { name: 'asc' },
    include: { students: { include: { student: { select: { id: true, name: true } } } } },
  });
  const students = new Map<string, { id: string; name: string; teams: string[] }>();
  for (const t of teams) {
    for (const { student } of t.students) {
      const s = students.get(student.id) ?? { ...student, teams: [] };
      s.teams.push(t.name);
      students.set(student.id, s);
    }
  }
  return { teams, students: [...students.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')) };
}

const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

// Matriz alunos × tipos de jogo + distribuição dos níveis (?teamId= filtra uma turma)
levelsRouter.get('/', async (req, res) => {
  const teamId = req.query.teamId ? idSchema.parse(req.query.teamId) : undefined;
  const scope = await studentsInScope(req.user!.id, teamId);
  if (teamId && scope.teams.length === 0) {
    res.status(404).json({ error: 'Turma não encontrada' });
    return;
  }
  const ids = scope.students.map((s) => s.id);
  const [levels, scores] = await Promise.all([
    prisma.studentLevel.findMany({ where: { studentId: { in: ids } } }),
    prisma.gameScore.findMany({
      where: { studentId: { in: ids }, performance: { not: null }, activity: { instructorId: req.user!.id } },
      orderBy: { completedAt: 'desc' },
      select: { studentId: true, gameType: true, performance: true, level: true },
    }),
  ]);

  const levelOf = new Map(levels.map((l) => [`${l.studentId}:${l.gameType}`, l]));
  const perfOf = new Map<string, number[]>();
  for (const s of scores) {
    const k = `${s.studentId}:${s.gameType}`;
    const xs = perfOf.get(k) ?? [];
    if (xs.length < RECENT * 2) xs.push(s.performance!);
    perfOf.set(k, xs);
  }

  const distribution = GAME_TYPES.map((gameType) => ({ gameType, easy: 0, normal: 0, hard: 0, none: 0 }));
  const rows = scope.students.map((s) => {
    const own = levels.filter((l) => l.studentId === s.id).map((l) => l.level);
    const starts = initialLevel(own);
    const games = Object.fromEntries(
      GAME_TYPES.map((gt, i) => {
        const l = levelOf.get(`${s.id}:${gt}`);
        const perf = perfOf.get(`${s.id}:${gt}`) ?? [];
        const recent = perf.slice(0, RECENT);
        const before = perf.slice(RECENT);
        if (l) distribution[i][l.level] += 1;
        else distribution[i].none += 1;
        return [
          gt,
          {
            level: l?.level ?? null,
            startsAt: l ? null : starts, // sem partidas adaptativas: começa neste nível
            locked: l?.locked ?? false,
            streak: l?.streak ?? 0,
            games: l?.games ?? 0,
            plays: perf.length,
            lastPerformance: perf[0] ?? null,
            avgPerformance: mean(recent),
            // média das últimas 5 menos a das 5 anteriores
            trend: recent.length && before.length ? mean(recent)! - mean(before)! : null,
          },
        ];
      }),
    );
    return { studentId: s.id, name: s.name, teams: s.teams, games };
  });

  res.json({ students: rows, distribution });
});

async function ownStudent(instructorId: string, studentId: string) {
  return prisma.user.findFirst({
    where: { id: studentId, role: 'STUDENT', enrollments: { some: { team: { instructorId } } } },
    select: { id: true, name: true },
  });
}

// Ficha de níveis de um aluno: nível por jogo, histórico e partidas com o desempenho detalhado
levelsRouter.get('/students/:id', async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const student = await ownStudent(req.user!.id, id);
  if (!student) {
    res.status(404).json({ error: 'Aluno não encontrado' });
    return;
  }
  const [levels, events, scores, tutor] = await Promise.all([
    prisma.studentLevel.findMany({ where: { studentId: id } }),
    prisma.levelEvent.findMany({ where: { studentId: id }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.gameScore.findMany({
      where: { studentId: id, activity: { instructorId: req.user!.id } },
      orderBy: { completedAt: 'desc' },
      take: 100,
      include: { activity: { select: { title: true } } },
    }),
    // conversas com o tutor IA nas atividades deste instrutor
    prisma.tutorMessage.findMany({
      where: { studentId: id, activity: { instructorId: req.user!.id } },
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: { activity: { select: { title: true } } },
    }),
  ]);
  const starts = initialLevel(levels.map((l) => l.level));
  const titles = new Map(scores.map((s) => [s.activityId, s.activity.title]));
  res.json({
    student,
    games: GAME_TYPES.map((gameType) => {
      const l = levels.find((x) => x.gameType === gameType);
      return {
        gameType,
        level: l?.level ?? null,
        startsAt: l ? null : starts,
        locked: l?.locked ?? false,
        streak: l?.streak ?? 0,
        games: l?.games ?? 0,
        lastPerformance: l?.lastPerformance ?? null,
      };
    }),
    events: events.map((e) => ({
      id: e.id,
      gameType: e.gameType,
      fromLevel: e.fromLevel,
      toLevel: e.toLevel,
      performance: e.performance,
      reason: e.reason,
      source: e.source,
      activity: e.activityId ? (titles.get(e.activityId) ?? null) : null,
      createdAt: e.createdAt,
    })),
    plays: scores.map((s) => ({
      activityId: s.activityId,
      activity: s.activity.title,
      blockId: s.blockId,
      gameType: s.gameType,
      level: s.level,
      score: s.score,
      maxScore: s.maxScore,
      durationSeconds: s.durationSeconds,
      performance: s.performance,
      metrics: s.metrics,
      completedAt: s.completedAt,
    })),
    tutor: tutor.map((m) => ({
      id: m.id,
      activityId: m.activityId,
      activity: m.activity.title,
      blockId: m.blockId,
      gameType: m.gameType,
      item: m.itemLabel,
      trigger: m.trigger,
      question: m.question,
      reply: m.reply,
      filtered: m.filtered,
      createdAt: m.createdAt,
    })),
  });
});

// Ajuste manual: muda o nível e/ou fixa (locked = o nível não muda sozinho)
levelsRouter.put('/students/:id/:gameType', async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const gameType = gameTypeSchema.parse(req.params.gameType) as GameType;
  const body = updateSchema.parse(req.body);
  const student = await ownStudent(req.user!.id, id);
  if (!student) {
    res.status(404).json({ error: 'Aluno não encontrado' });
    return;
  }
  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.studentLevel.findUnique({ where: { studentId_gameType: { studentId: id, gameType } } });
    const others = await tx.studentLevel.findMany({ where: { studentId: id, gameType: { not: gameType } } });
    const from: Level = before?.level ?? initialLevel(others.map((o) => o.level));
    const to: Level = body.level ?? from;
    const locked = body.locked ?? before?.locked ?? false;
    const row = await tx.studentLevel.upsert({
      where: { studentId_gameType: { studentId: id, gameType } },
      create: { studentId: id, gameType, level: to, locked },
      update: { level: to, locked, ...(to !== from ? { streak: 0 } : {}) },
    });
    const parts = [
      to !== from ? 'Nível ajustado pelo instrutor' : null,
      body.locked === true && !before?.locked ? 'nível fixado' : null,
      body.locked === false && before?.locked ? 'ajuste automático liberado' : null,
    ].filter(Boolean) as string[];
    if (parts.length) {
      const reason = parts.join('; ');
      await tx.levelEvent.create({
        data: {
          studentId: id,
          gameType,
          fromLevel: before ? from : null,
          toLevel: to,
          reason: reason[0].toUpperCase() + reason.slice(1),
          source: 'INSTRUCTOR',
        },
      });
    }
    return row;
  });
  res.json({ level: { gameType, level: result.level, locked: result.locked, streak: result.streak, games: result.games } });
});
