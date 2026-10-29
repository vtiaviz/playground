// Aprendizado personalizado no servidor: qual nível cada aluno joga em cada jogo adaptativo e
// como o resultado de uma partida muda o nível dele. As regras (desempenho e subir/descer) ficam
// no pacote de jogos (`@playground/games/adaptive`), iguais para servidor e navegador.
import type { GameType, Level, Prisma } from '@prisma/client';
import {
  availableLevels,
  initialLevel,
  measurePerformance,
  nextLevel,
  pickLevel,
  type LevelChange,
  type Performance,
} from '@playground/games/adaptive';
import { maxScoreFor } from '@playground/games/validate';
import { prisma } from '../prisma';
import type { DocNode, StoredGame } from './content';

type Tx = Prisma.TransactionClient;

export interface StudentLevels {
  byType: Map<GameType, { level: Level; locked: boolean }>;
  // nível de quem ainda não jogou aquele tipo (média dos outros; sem histórico, Normal)
  fallback: Level;
}

export async function loadStudentLevels(studentId: string, db: Tx | typeof prisma = prisma): Promise<StudentLevels> {
  const rows = await db.studentLevel.findMany({ where: { studentId } });
  return {
    byType: new Map(rows.map((r) => [r.gameType, { level: r.level, locked: r.locked }])),
    fallback: initialLevel(rows.map((r) => r.level)),
  };
}

export const currentLevel = (levels: StudentLevels, type: GameType): Level =>
  levels.byType.get(type)?.level ?? levels.fallback;

export interface ResolvedGame {
  blockId: string;
  gameType: GameType;
  adaptive: boolean;
  level: Level | null;
  levelCount: number;
  config: unknown;
  maxScore: number;
}

// Nível e configuração que ESTE aluno joga em cada jogo da atividade:
// já jogado -> nível em que jogou; já começou -> nível travado no "Começar"; senão -> nível atual.
export function resolveGames(
  games: StoredGame[],
  levels: StudentLevels,
  played: Map<string, Level | null>,
  started: Map<string, Level | null>,
): ResolvedGame[] {
  return games.map((g) => {
    const type = g.gameType as GameType;
    if (!g.levels) {
      return {
        blockId: g.blockId,
        gameType: type,
        adaptive: false,
        level: null,
        levelCount: 0,
        config: g.config,
        maxScore: maxScoreFor(type, g.config) ?? 0,
      };
    }
    const wanted = played.get(g.blockId) ?? started.get(g.blockId) ?? currentLevel(levels, type);
    const level = pickLevel(g.levels, wanted);
    const config = g.levels[level] ?? g.config;
    return {
      blockId: g.blockId,
      gameType: type,
      adaptive: true,
      level,
      levelCount: availableLevels(g.levels).length,
      config,
      maxScore: maxScoreFor(type, config) ?? 0,
    };
  });
}

// Documento para o aluno: cada jogo adaptativo leva só a config do nível dele (as outras ficam no
// servidor), mais `level` e `adaptive` para a tela mostrar o selo.
export function contentFor(content: unknown, resolved: ResolvedGame[]): unknown {
  const byId = new Map(resolved.map((r) => [r.blockId, r]));
  const doc = content as DocNode;
  if (!doc || !Array.isArray(doc.content)) return content;
  return {
    ...doc,
    content: doc.content.map((n) => {
      if (n.type !== 'gameBlock' || !n.attrs) return n;
      const r = byId.get(String(n.attrs.blockId));
      if (!r || !r.adaptive) return n;
      const { levels: _levels, ...attrs } = n.attrs;
      return { ...n, attrs: { ...attrs, config: r.config, level: r.level, adaptive: true, levelCount: r.levelCount } };
    }),
  };
}

export interface LevelOutcome {
  played: Level;
  before: Level;
  after: Level;
  change: LevelChange;
  reason: string;
  locked: boolean;
}

// Aplica o resultado de uma partida adaptativa ao nível do aluno naquele tipo de jogo (dentro da
// mesma transação que grava a nota). A linha do aluno é travada para duas notas simultâneas não
// se atropelarem.
export async function applyResult(
  tx: Tx,
  args: { studentId: string; gameType: GameType; played: Level; performance: Performance; activityId: string; blockId: string },
): Promise<LevelOutcome> {
  const { studentId, gameType } = args;
  const levels = await loadStudentLevels(studentId, tx);
  await tx.studentLevel.upsert({
    where: { studentId_gameType: { studentId, gameType } },
    create: { studentId, gameType, level: levels.byType.get(gameType)?.level ?? args.played },
    update: {},
  });
  await tx.$queryRaw`SELECT 1 FROM student_levels WHERE student_id = ${studentId}::uuid AND game_type = ${gameType}::"GameType" FOR UPDATE`;
  const row = await tx.studentLevel.findUniqueOrThrow({ where: { studentId_gameType: { studentId, gameType } } });

  const d = nextLevel({ level: row.level, streak: row.streak }, args.performance.score, row.locked);
  await tx.studentLevel.update({
    where: { studentId_gameType: { studentId, gameType } },
    data: { level: d.level, streak: d.streak, games: { increment: 1 }, lastPerformance: args.performance.score },
  });
  await tx.levelEvent.create({
    data: {
      studentId,
      gameType,
      fromLevel: row.level,
      toLevel: d.level,
      performance: args.performance.score,
      reason: d.reason,
      source: 'GAME',
      activityId: args.activityId,
      blockId: args.blockId,
    },
  });
  return { played: args.played, before: row.level, after: d.level, change: d.change, reason: d.reason, locked: row.locked };
}

export { measurePerformance };
