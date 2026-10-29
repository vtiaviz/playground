import { Router, type Request } from 'express';
import { z } from 'zod';
import type { SavedGame } from '@prisma/client';
import { isGameType, maxScoreFor, validateGameConfig, type GameType } from '@playground/games/validate';
import { prisma } from '../prisma';
import { requireAuth, requirePasswordChanged, requireRole } from '../middleware/auth';

export const gamesRouter = Router();

// Biblioteca de jogos do instrutor (só enxerga os próprios)
gamesRouter.use(requireAuth, requirePasswordChanged, requireRole('INSTRUCTOR'));

const MAX_LIBRARY = 500;
const idSchema = z.string().uuid('Identificador inválido');
const notFound = { error: 'Jogo não encontrado' };

const createSchema = z.object({ gameType: z.string(), config: z.unknown() });
const updateSchema = z.object({ config: z.unknown() });
// Vários jogos de uma vez (ex.: os três níveis gerados pela IA): ou entram todos, ou nenhum
const batchSchema = z.object({
  games: z.array(createSchema).min(1, 'Envie ao menos um jogo').max(10, 'No máximo 10 jogos por vez'),
});

const toGame = (g: SavedGame) => ({
  id: g.id,
  gameType: g.gameType,
  title: g.title,
  config: g.config,
  maxScore: maxScoreFor(g.gameType as GameType, g.config),
  createdAt: g.createdAt,
  updatedAt: g.updatedAt,
});

const titleOf = (config: unknown): string => {
  const t = (config as { title?: unknown } | null)?.title;
  return typeof t === 'string' && t.trim() ? t.trim().slice(0, 80) : 'Jogo sem título';
};

async function findOwned(req: Request) {
  const id = idSchema.parse(req.params.id);
  return prisma.savedGame.findFirst({ where: { id, instructorId: req.user!.id } });
}

gamesRouter.get('/', async (req, res) => {
  const rows = await prisma.savedGame.findMany({ where: { instructorId: req.user!.id }, orderBy: { updatedAt: 'desc' } });
  res.json({ games: rows.map(toGame) });
});

gamesRouter.post('/', async (req, res) => {
  const body = createSchema.parse(req.body);
  if (!isGameType(body.gameType)) {
    res.status(400).json({ error: 'Tipo de jogo desconhecido' });
    return;
  }
  const config = validateGameConfig(body.gameType, body.config);
  if (config === null) {
    res.status(400).json({ error: 'A configuração do jogo é inválida' });
    return;
  }
  if ((await prisma.savedGame.count({ where: { instructorId: req.user!.id } })) >= MAX_LIBRARY) {
    res.status(400).json({ error: `A biblioteca comporta até ${MAX_LIBRARY} jogos` });
    return;
  }
  const g = await prisma.savedGame.create({
    data: { instructorId: req.user!.id, gameType: body.gameType, title: titleOf(config), config: config as object },
  });
  res.status(201).json({ game: toGame(g) });
});

gamesRouter.post('/batch', async (req, res) => {
  const body = batchSchema.parse(req.body);
  const data = [];
  for (const [i, g] of body.games.entries()) {
    const config = isGameType(g.gameType) ? validateGameConfig(g.gameType, g.config) : null;
    if (!isGameType(g.gameType) || config === null) {
      res.status(400).json({ error: `O jogo ${i + 1} é inválido` });
      return;
    }
    data.push({ instructorId: req.user!.id, gameType: g.gameType, title: titleOf(config), config: config as object });
  }
  if ((await prisma.savedGame.count({ where: { instructorId: req.user!.id } })) + data.length > MAX_LIBRARY) {
    res.status(400).json({ error: `A biblioteca comporta até ${MAX_LIBRARY} jogos` });
    return;
  }
  const games = await prisma.$transaction(data.map((d) => prisma.savedGame.create({ data: d })));
  res.status(201).json({ games: games.map(toGame) });
});

gamesRouter.get('/:id', async (req, res) => {
  const g = await findOwned(req);
  if (!g) {
    res.status(404).json(notFound);
    return;
  }
  res.json({ game: toGame(g) });
});

// Editar o jogo da biblioteca NÃO altera atividades que já o usaram (elas guardam uma cópia)
gamesRouter.put('/:id', async (req, res) => {
  const g = await findOwned(req);
  if (!g) {
    res.status(404).json(notFound);
    return;
  }
  const body = updateSchema.parse(req.body);
  const config = validateGameConfig(g.gameType as GameType, body.config);
  if (config === null) {
    res.status(400).json({ error: 'A configuração do jogo é inválida' });
    return;
  }
  const updated = await prisma.savedGame.update({ where: { id: g.id }, data: { title: titleOf(config), config: config as object } });
  res.json({ game: toGame(updated) });
});

gamesRouter.post('/:id/duplicate', async (req, res) => {
  const g = await findOwned(req);
  if (!g) {
    res.status(404).json(notFound);
    return;
  }
  const base = titleOf(g.config);
  const title = `${base.slice(0, 70)} (cópia)`;
  const config = { ...(g.config as object), title };
  const copy = await prisma.savedGame.create({
    data: { instructorId: g.instructorId, gameType: g.gameType, title, config },
  });
  res.status(201).json({ game: toGame(copy) });
});

gamesRouter.delete('/:id', async (req, res) => {
  const g = await findOwned(req);
  if (!g) {
    res.status(404).json(notFound);
    return;
  }
  await prisma.savedGame.delete({ where: { id: g.id } });
  res.status(204).end();
});
