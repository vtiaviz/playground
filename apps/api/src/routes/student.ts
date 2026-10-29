import { Router, type Request } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { pickLevel, type Performance } from '@playground/games/adaptive';
import { maxScoreFor, type GameType } from '@playground/games/validate';
import { tutorItem, type TutorTurn } from '@playground/games/tutor';
import { config } from '../config';
import { LlmError } from '../ai/llm';
import { TUTOR_DISABLED, askTutor, tutorAskSchema, tutorEnabled, tutorStatus } from '../ai/tutor';
import { prisma } from '../prisma';
import { requireAuth, requirePasswordChanged, requireRole } from '../middleware/auth';
import { gamesIn } from '../lib/content';
import {
  applyResult,
  contentFor,
  currentLevel,
  loadStudentLevels,
  measurePerformance,
  resolveGames,
  type LevelOutcome,
  type StudentLevels,
} from '../lib/adaptive';

export const studentRouter = Router();

// Tudo aqui é exclusivo do aluno e só enxerga atividades PUBLICADAS para as turmas dele
studentRouter.use(requireAuth, requirePasswordChanged, requireRole('STUDENT'));

const idSchema = z.string().uuid('Identificador inválido');
const notFound = { error: 'Atividade não encontrada' };

const scoreSchema = z.object({
  blockId: z.string().min(1).max(64),
  score: z.number().int('Pontuação inválida').min(0, 'Pontuação inválida'),
  maxScore: z.number().int().positive().optional(), // conferido contra o valor calculado pelo servidor
  durationSeconds: z.number().int().min(0).max(86_400).nullish(),
  details: z.record(z.unknown()).optional(),
});

const startSchema = z.object({ blockId: z.string().min(1).max(64) });

const feedbackSchema = z.object({
  rating: z.number().int('Nota inválida').min(1, 'A nota vai de 1 a 5').max(5, 'A nota vai de 1 a 5'),
  comment: z
    .string()
    .trim()
    .max(1000, 'O comentário pode ter no máximo 1000 caracteres')
    .nullish()
    .transform((v) => (v ? v : null)),
});

const visibleInclude = (studentId: string) =>
  ({
    scores: { where: { studentId } },
    feedbacks: { where: { studentId } },
    gameStarts: { where: { studentId } },
  }) satisfies Prisma.ActivityInclude;

async function loadVisible(req: Request) {
  const id = idSchema.parse(req.params.id);
  const studentId = req.user!.id;
  return prisma.activity.findFirst({
    where: {
      id,
      publishedAt: { not: null },
      teams: { some: { team: { students: { some: { studentId } } } } },
    },
    include: visibleInclude(studentId),
  });
}

type Visible = NonNullable<Awaited<ReturnType<typeof loadVisible>>>;

// Jogos da atividade como ESTE aluno os vê (no jogo adaptativo: o nível e a config dele)
const resolvedOf = (a: Visible, levels: StudentLevels) =>
  resolveGames(
    gamesIn(a.contentJson),
    levels,
    new Map(a.scores.map((s) => [s.blockId, s.level])),
    new Map(a.gameStarts.map((s) => [s.blockId, s.level])),
  );

// Resumo do progresso do aluno numa atividade
function progressOf(a: Visible, levels: StudentLevels) {
  const games = resolvedOf(a, levels);
  const byBlock = new Map(a.scores.map((s) => [s.blockId, s]));
  const played = games.filter((g) => byBlock.has(g.blockId));
  const maxScore = games.reduce((sum, g) => sum + (byBlock.get(g.blockId)?.maxScore ?? g.maxScore), 0);
  const score = played.reduce((sum, g) => sum + byBlock.get(g.blockId)!.score, 0);
  const feedbackGiven = a.feedbacks.length > 0;
  const finishedGames = games.length === 0 || played.length === games.length;
  return {
    gameCount: games.length,
    playedCount: played.length,
    score,
    maxScore,
    feedbackGiven,
    // concluída: todos os jogos feitos (atividade só de texto: concluída ao enviar o feedback)
    done: games.length === 0 ? feedbackGiven : finishedGames,
    finishedGames,
  };
}

const header = (a: Visible, levels: StudentLevels) => ({
  id: a.id,
  title: a.title,
  publishedAt: a.publishedAt,
  dueAt: a.dueAt,
  ...progressOf(a, levels),
});

studentRouter.get('/activities', async (req, res) => {
  const studentId = req.user!.id;
  const rows = await prisma.activity.findMany({
    where: {
      publishedAt: { not: null },
      teams: { some: { team: { students: { some: { studentId } } } } },
    },
    orderBy: { publishedAt: 'desc' },
    include: visibleInclude(studentId),
  });
  const levels = await loadStudentLevels(studentId);
  res.json({ activities: rows.map((a) => header(a, levels)) });
});

studentRouter.get('/activities/:id', async (req, res) => {
  const a = await loadVisible(req);
  if (!a) {
    res.status(404).json(notFound);
    return;
  }
  const levels = await loadStudentLevels(req.user!.id);
  res.json({
    activity: { ...header(a, levels), content: contentFor(a.contentJson, resolvedOf(a, levels)) },
    scores: a.scores.map((s) => ({
      blockId: s.blockId,
      score: s.score,
      maxScore: s.maxScore,
      durationSeconds: s.durationSeconds,
      completedAt: s.completedAt,
      level: s.level,
      performance: s.performance,
    })),
    feedback: a.feedbacks[0] ? { rating: a.feedbacks[0].rating, comment: a.feedbacks[0].comment } : null,
  });
});

// "Começar" de um jogo. No jogo adaptativo trava o nível daquele jogo para o aluno (a config não
// muda mais, mesmo que o nível dele mude por causa de outro jogo). Pode ser chamado de novo.
studentRouter.post('/activities/:id/start', async (req, res) => {
  const a = await loadVisible(req);
  if (!a) {
    res.status(404).json(notFound);
    return;
  }
  const { blockId } = startSchema.parse(req.body);
  const studentId = req.user!.id;
  const levels = await loadStudentLevels(studentId);
  const game = resolvedOf(a, levels).find((g) => g.blockId === blockId);
  if (!game) {
    res.status(404).json({ error: 'Jogo não encontrado nesta atividade' });
    return;
  }
  if (a.scores.some((s) => s.blockId === blockId)) {
    res.status(409).json({ error: 'Você já concluiu este jogo', code: 'ALREADY_PLAYED' });
    return;
  }
  // já começou antes: vale o nível travado da primeira vez
  await prisma.gameStart.upsert({
    where: { studentId_activityId_blockId: { studentId, activityId: a.id, blockId } },
    create: { studentId, activityId: a.id, blockId, level: game.level },
    update: {},
  });
  res.json({ game: { blockId, level: game.level, adaptive: game.adaptive, config: game.config } });
});

// Grava a nota de UM jogo. Cada jogo vale uma vez por aluno (a primeira tentativa fica registrada).
// O servidor não consegue "assistir" a partida: ele confere que o jogo existe na atividade e que a
// nota cabe no máximo calculado a partir da configuração (não aceita nota maior que o possível).
// Também calcula o desempenho (acerto, tempo por item…) e, no jogo adaptativo, ajusta o nível.
studentRouter.post('/activities/:id/scores', async (req, res) => {
  const a = await loadVisible(req);
  if (!a) {
    res.status(404).json(notFound);
    return;
  }
  const body = scoreSchema.parse(req.body);
  const studentId = req.user!.id;
  const levels = await loadStudentLevels(studentId);
  const resolved = resolvedOf(a, levels);

  const game = resolved.find((g) => g.blockId === body.blockId);
  if (!game) {
    res.status(404).json({ error: 'Jogo não encontrado nesta atividade' });
    return;
  }
  const serverMax = maxScoreFor(game.gameType, game.config);
  if (serverMax === null) {
    res.status(409).json({ error: 'Este jogo está com a configuração inválida' });
    return;
  }
  if (body.maxScore !== undefined && body.maxScore !== serverMax) {
    res.status(400).json({ error: 'Pontuação máxima divergente' });
    return;
  }
  if (body.score > serverMax) {
    res.status(400).json({ error: 'Pontuação acima do máximo do jogo' });
    return;
  }
  if (body.details !== undefined && JSON.stringify(body.details).length > 20_000) {
    res.status(400).json({ error: 'Detalhes grandes demais' });
    return;
  }

  const existing = a.scores.find((s) => s.blockId === body.blockId);
  if (existing) {
    res.status(409).json({ error: 'Você já concluiu este jogo', code: 'ALREADY_PLAYED', score: existing.score });
    return;
  }

  // pedidos de ajuda ao tutor IA neste jogo descontam um pouco do desempenho (a nota não muda)
  const hints = await prisma.tutorMessage.count({ where: { studentId, activityId: a.id, blockId: body.blockId } });
  const performance: Performance = measurePerformance(game.gameType, game.config, {
    score: body.score,
    maxScore: serverMax,
    durationSeconds: body.durationSeconds,
    details: body.details,
    hints,
  });

  try {
    const { created, outcome } = await prisma.$transaction(async (tx) => {
      const created = await tx.gameScore.create({
        data: {
          studentId,
          activityId: a.id,
          blockId: body.blockId,
          gameType: game.gameType,
          score: body.score,
          maxScore: serverMax,
          durationSeconds: body.durationSeconds ?? null,
          details: (body.details ?? undefined) as Prisma.InputJsonValue | undefined,
          level: game.level,
          performance: performance.score,
          metrics: performance as unknown as Prisma.InputJsonValue,
        },
      });
      const outcome: LevelOutcome | null =
        game.adaptive && game.level
          ? await applyResult(tx, {
              studentId,
              gameType: game.gameType,
              played: game.level,
              performance,
              activityId: a.id,
              blockId: body.blockId,
            })
          : null;
      return { created, outcome };
    });

    // Jogos adaptativos desta atividade que o aluno ainda não começou passam a usar o nível novo
    let updatedGames: { blockId: string; level: string; config: unknown }[] = [];
    if (outcome && outcome.after !== outcome.before) {
      const after = await loadStudentLevels(studentId);
      updatedGames = resolved
        .filter(
          (g) =>
            g.adaptive &&
            g.gameType === game.gameType &&
            g.blockId !== body.blockId &&
            !a.scores.some((s) => s.blockId === g.blockId) &&
            !a.gameStarts.some((s) => s.blockId === g.blockId),
        )
        .map((g) => {
          const stored = gamesIn(a.contentJson).find((x) => x.blockId === g.blockId)!;
          const level = pickLevel(stored.levels!, currentLevel(after, g.gameType));
          return { blockId: g.blockId, level, config: stored.levels![level] };
        })
        .filter((g) => g.level !== resolved.find((r) => r.blockId === g.blockId)?.level);
    }

    res.status(201).json({
      score: { blockId: created.blockId, score: created.score, maxScore: created.maxScore, level: created.level },
      performance,
      level: outcome,
      updatedGames,
    });
  } catch (e) {
    // duas requisições ao mesmo tempo: a segunda bate na chave única
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      res.status(409).json({ error: 'Você já concluiu este jogo', code: 'ALREADY_PLAYED' });
      return;
    }
    throw e;
  }
});

// ---------- Tutor IA ----------

const tutorLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: () => config.tutor.rateLimit,
  keyGenerator: (req) => req.user!.id,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Você pediu muitas ajudas seguidas. Tente sozinho um pouco e peça de novo daqui a alguns minutos.', code: 'TUTOR_LIMIT' },
});

const tutorSchema = tutorAskSchema.and(z.object({ blockId: z.string().min(1).max(64) }));
const TRIGGER = { button: 'BUTTON', idle: 'IDLE', message: 'MESSAGE' } as const;

studentRouter.get('/tutor', (_req, res) => {
  res.json(tutorStatus());
});

// Pedido de ajuda num jogo em andamento. O servidor sabe a configuração do jogo (no nível do aluno)
// e monta o contexto e a conversa anterior a partir do banco; do navegador só vêm o item, o que o
// aluno já fez nele e a mensagem.
studentRouter.post('/activities/:id/tutor', tutorLimiter, async (req, res) => {
  if (!tutorEnabled()) {
    res.status(503).json(TUTOR_DISABLED);
    return;
  }
  const a = await loadVisible(req);
  if (!a) {
    res.status(404).json(notFound);
    return;
  }
  const body = tutorSchema.parse(req.body);
  const studentId = req.user!.id;
  const game = resolvedOf(a, await loadStudentLevels(studentId)).find((g) => g.blockId === body.blockId);
  if (!game) {
    res.status(404).json({ error: 'Jogo não encontrado nesta atividade' });
    return;
  }
  if (a.scores.some((s) => s.blockId === body.blockId)) {
    res.status(409).json({ error: 'Você já concluiu este jogo', code: 'ALREADY_PLAYED' });
    return;
  }
  const item = tutorItem(game.gameType, game.config, body.item);
  if (!item) {
    res.status(400).json({ error: 'Pergunta inválida para este jogo' });
    return;
  }

  const where = { studentId, activityId: a.id, blockId: body.blockId, item: body.item };
  const [previous, asked] = await Promise.all([
    prisma.tutorMessage.findMany({ where, orderBy: { createdAt: 'desc' }, take: 4 }),
    prisma.tutorMessage.count({ where }),
  ]);
  const history: TutorTurn[] = previous.reverse().flatMap((m) => [
    { role: 'student' as const, text: m.question ?? (m.trigger === 'IDLE' ? '(aceitou a ajuda oferecida)' : '(pediu ajuda)') },
    { role: 'tutor' as const, text: m.reply },
  ]);

  try {
    const r = await askTutor(item, {
      state: body.state,
      trigger: body.trigger,
      message: body.message,
      history,
      helpNumber: asked + 1,
    });
    await prisma.tutorMessage.create({
      data: {
        studentId,
        activityId: a.id,
        blockId: body.blockId,
        gameType: game.gameType,
        item: body.item,
        itemLabel: item.label,
        trigger: TRIGGER[body.trigger],
        question: body.trigger === 'message' ? body.message! : null,
        reply: r.reply,
        filtered: r.filtered,
      },
    });
    const hints = await prisma.tutorMessage.count({ where: { studentId, activityId: a.id, blockId: body.blockId } });
    res.json({ reply: r.reply, label: item.label, hints });
  } catch (e) {
    if (e instanceof LlmError) {
      res.status(e.status).json({ error: e.status === 429 ? 'O tutor está muito ocupado agora. Tente de novo em instantes.' : 'O tutor não conseguiu responder agora. Tente de novo.' });
      return;
    }
    throw e;
  }
});

// Avaliação final (1 a 5 + comentário). Só depois de terminar os jogos; pode ser reenviada/ajustada.
studentRouter.put('/activities/:id/feedback', async (req, res) => {
  const a = await loadVisible(req);
  if (!a) {
    res.status(404).json(notFound);
    return;
  }
  if (!progressOf(a, await loadStudentLevels(req.user!.id)).finishedGames) {
    res.status(409).json({ error: 'Conclua os jogos da atividade antes de avaliar' });
    return;
  }
  const body = feedbackSchema.parse(req.body);
  const studentId = req.user!.id;
  const fb = await prisma.feedback.upsert({
    where: { studentId_activityId: { studentId, activityId: a.id } },
    create: { studentId, activityId: a.id, rating: body.rating, comment: body.comment },
    update: { rating: body.rating, comment: body.comment },
  });
  res.json({ feedback: { rating: fb.rating, comment: fb.comment } });
});

// ---------- Ranking ----------

interface RankRow {
  rank: number;
  studentId: string;
  name: string;
  total: number;
  isMe: boolean;
}

function rankRows(students: { id: string; name: string }[], totals: Map<string, number>, meId: string): RankRow[] {
  const sorted = students
    .map((s) => ({ studentId: s.id, name: s.name, total: totals.get(s.id) ?? 0, isMe: s.id === meId }))
    .sort((x, y) => y.total - x.total || x.name.localeCompare(y.name, 'pt-BR'));
  let rank = 0;
  return sorted.map((r, i) => {
    if (i === 0 || r.total !== sorted[i - 1].total) rank = i + 1; // empate = mesma posição
    return { ...r, rank };
  });
}

studentRouter.get('/ranking', async (req, res) => {
  const meId = req.user!.id;
  const teams = await prisma.team.findMany({
    where: { students: { some: { studentId: meId } } },
    orderBy: { name: 'asc' },
    include: {
      students: { include: { student: { select: { id: true, name: true } } } },
      activities: { where: { activity: { publishedAt: { not: null } } }, select: { activityId: true } },
    },
  });

  const sumBy = async (activityIds: string[], studentIds: string[]) => {
    if (activityIds.length === 0 || studentIds.length === 0) return new Map<string, number>();
    const rows = await prisma.gameScore.groupBy({
      by: ['studentId'],
      where: { activityId: { in: activityIds }, studentId: { in: studentIds } },
      _sum: { score: true },
    });
    return new Map(rows.map((r) => [r.studentId, r._sum.score ?? 0]));
  };

  const perTeam = [];
  const allStudents = new Map<string, { id: string; name: string }>();
  const allActivities = new Set<string>();
  for (const t of teams) {
    const students = t.students.map((x) => x.student);
    const activityIds = t.activities.map((x) => x.activityId);
    students.forEach((s) => allStudents.set(s.id, s));
    activityIds.forEach((id) => allActivities.add(id));
    perTeam.push({
      id: t.id,
      name: t.name,
      ranking: rankRows(students, await sumBy(activityIds, students.map((s) => s.id)), meId),
    });
  }

  const general = rankRows(
    [...allStudents.values()],
    await sumBy([...allActivities], [...allStudents.keys()]),
    meId,
  );
  res.json({ general, teams: perTeam, me: general.find((r) => r.isMe) ?? null });
});
