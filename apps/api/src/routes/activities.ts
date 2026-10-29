import { Router, type Request } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth, requirePasswordChanged, requireRole } from '../middleware/auth';
import { EMPTY_DOC, gamesIn, sameJson, validateContent } from '../lib/content';

export const activitiesRouter = Router();

// Tudo aqui é exclusivo do instrutor (e só das atividades dele)
activitiesRouter.use(requireAuth, requirePasswordChanged, requireRole('INSTRUCTOR'));

const idSchema = z.string().uuid('Identificador inválido');
const titleSchema = z.string().trim().min(1, 'Informe o título da atividade').max(120, 'O título pode ter no máximo 120 caracteres');
const dueSchema = z.string().datetime({ offset: true, message: 'Data inválida' }).nullish();

const createSchema = z.object({ title: titleSchema, content: z.unknown().optional() });
const updateSchema = z
  .object({ title: titleSchema.optional(), content: z.unknown().optional(), dueAt: dueSchema })
  .refine((d) => d.title !== undefined || d.content !== undefined || d.dueAt !== undefined, { message: 'Nada para atualizar' });
const publishSchema = z.object({
  teamIds: z.array(idSchema).min(1, 'Escolha ao menos uma turma').max(50),
  dueAt: dueSchema,
});

const notFound = { error: 'Atividade não encontrada' };

type ActivityWithTeams = Awaited<ReturnType<typeof loadOwned>>;

async function loadOwned(req: Request) {
  const id = idSchema.parse(req.params.id);
  return prisma.activity.findFirst({
    where: { id, instructorId: req.user!.id },
    include: { teams: { include: { team: true } }, _count: { select: { scores: true } } },
  });
}

const toActivity = (a: NonNullable<ActivityWithTeams>, withContent: boolean) => ({
  id: a.id,
  title: a.title,
  status: a.publishedAt ? ('PUBLISHED' as const) : ('DRAFT' as const),
  publishedAt: a.publishedAt,
  dueAt: a.dueAt,
  updatedAt: a.updatedAt,
  teams: a.teams.map((t) => ({ id: t.team.id, name: t.team.name })).sort((x, y) => x.name.localeCompare(y.name, 'pt-BR')),
  gameCount: gamesIn(a.contentJson).length,
  hasScores: a._count.scores > 0,
  ...(withContent ? { content: a.contentJson } : {}),
});

// Quem já jogou: os jogos com notas gravadas não podem sumir nem mudar (a nota ficaria sem sentido)
async function scoredBlockConflict(
  activityId: string,
  next: { blockId: string; gameType: string; config: unknown; levels?: unknown }[],
) {
  const scored = await prisma.gameScore.findMany({ where: { activityId }, select: { blockId: true }, distinct: ['blockId'] });
  if (scored.length === 0) return null;
  const old = new Map(
    gamesIn((await prisma.activity.findUniqueOrThrow({ where: { id: activityId } })).contentJson).map((g) => [g.blockId, g]),
  );
  const now = new Map(next.map((g) => [g.blockId, g]));
  for (const { blockId } of scored) {
    const before = old.get(blockId);
    const after = now.get(blockId);
    if (!after) return 'Um jogo que já tem notas de alunos não pode ser removido.';
    if (
      before &&
      (before.gameType !== after.gameType ||
        !sameJson(before.config, after.config) ||
        !sameJson(before.levels ?? null, after.levels ?? null))
    )
      return 'Um jogo que já tem notas de alunos não pode ser alterado.';
  }
  return null;
}

activitiesRouter.get('/', async (req, res) => {
  const rows = await prisma.activity.findMany({
    where: { instructorId: req.user!.id },
    orderBy: { updatedAt: 'desc' },
    include: { teams: { include: { team: true } }, _count: { select: { scores: true } } },
  });
  res.json({ activities: rows.map((a) => toActivity(a, false)) });
});

activitiesRouter.post('/', async (req, res) => {
  const body = createSchema.parse(req.body);
  let content = EMPTY_DOC as unknown;
  if (body.content !== undefined) {
    const v = validateContent(body.content);
    if (!v.ok) {
      res.status(400).json({ error: v.error });
      return;
    }
    content = v.content;
  }
  const created = await prisma.activity.create({
    data: { title: body.title, contentJson: content as object, instructorId: req.user!.id },
    include: { teams: { include: { team: true } }, _count: { select: { scores: true } } },
  });
  res.status(201).json({ activity: toActivity(created, true) });
});

activitiesRouter.get('/:id', async (req, res) => {
  const a = await loadOwned(req);
  if (!a) {
    res.status(404).json(notFound);
    return;
  }
  res.json({ activity: toActivity(a, true) });
});

activitiesRouter.patch('/:id', async (req, res) => {
  const a = await loadOwned(req);
  if (!a) {
    res.status(404).json(notFound);
    return;
  }
  const body = updateSchema.parse(req.body);

  const data: { title?: string; contentJson?: object; dueAt?: Date | null } = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.dueAt !== undefined) data.dueAt = body.dueAt ? new Date(body.dueAt) : null;
  if (body.content !== undefined) {
    const v = validateContent(body.content);
    if (!v.ok) {
      res.status(400).json({ error: v.error });
      return;
    }
    const conflict = await scoredBlockConflict(a.id, v.games);
    if (conflict) {
      res.status(409).json({ error: conflict });
      return;
    }
    data.contentJson = v.content as object;
  }

  await prisma.activity.update({ where: { id: a.id }, data });
  const fresh = (await loadOwned(req))!;
  res.json({ activity: toActivity(fresh, true) });
});

// Publica (ou atualiza as turmas de uma atividade já publicada)
activitiesRouter.post('/:id/publish', async (req, res) => {
  const a = await loadOwned(req);
  if (!a) {
    res.status(404).json(notFound);
    return;
  }
  const body = publishSchema.parse(req.body);
  const teamIds = [...new Set(body.teamIds)];

  const owned = await prisma.team.count({ where: { id: { in: teamIds }, instructorId: req.user!.id } });
  if (owned !== teamIds.length) {
    res.status(400).json({ error: 'Turma inválida' });
    return;
  }

  await prisma.$transaction([
    prisma.activityTeam.deleteMany({ where: { activityId: a.id } }),
    prisma.activityTeam.createMany({ data: teamIds.map((teamId) => ({ activityId: a.id, teamId })) }),
    prisma.activity.update({
      where: { id: a.id },
      data: {
        publishedAt: a.publishedAt ?? new Date(),
        ...(body.dueAt !== undefined ? { dueAt: body.dueAt ? new Date(body.dueAt) : null } : {}),
      },
    }),
  ]);
  const fresh = (await loadOwned(req))!;
  res.json({ activity: toActivity(fresh, false) });
});

// Volta para rascunho: os alunos deixam de ver; notas já gravadas são mantidas
activitiesRouter.post('/:id/unpublish', async (req, res) => {
  const a = await loadOwned(req);
  if (!a) {
    res.status(404).json(notFound);
    return;
  }
  await prisma.activity.update({ where: { id: a.id }, data: { publishedAt: null } });
  const fresh = (await loadOwned(req))!;
  res.json({ activity: toActivity(fresh, false) });
});

activitiesRouter.delete('/:id', async (req, res) => {
  const a = await loadOwned(req);
  if (!a) {
    res.status(404).json(notFound);
    return;
  }
  await prisma.activity.delete({ where: { id: a.id } }); // apaga também vínculos, notas e feedbacks
  res.status(204).end();
});
