// Aprendizado personalizado (nível adaptativo) — SEM React: roda no servidor
// (`@playground/games/adaptive`) e no navegador.
//
// 1. Cada partida vira um DESEMPENHO de 0 a 100 (measurePerformance), calculado item a item
//    (pergunta, palavra, lacuna) a partir de `details.items` que os jogos enviam:
//      - acerto (peso 70%): média do acerto dos itens;
//      - ritmo (peso 30%): tempo de cada item ACERTADO comparado com o tempo esperado para ele
//        (pergunta longa tem mais tempo; palavra grande também);
//      - descontos: chutes (errou muito mais rápido do que daria para ler), pedidos de
//        "Verificar" nas cruzadas, seleções erradas no caça-palavras e pedidos de ajuda ao tutor IA.
// 2. O desempenho decide o nível do aluno naquele tipo de jogo (nextLevel), com folga para não
//    ficar subindo e descendo: dois desempenhos bons seguidos sobem, dois ruins seguidos descem;
//    um desempenho excelente sobe na hora e um muito baixo desce na hora.
import { generate } from './cacapalavras/lib/generator';
import { validateConfig as frasesValidate } from './completefrases/config';
import { validateConfig as cruzValidate } from './cruzadas/config';
import { validateConfig as forcaValidate } from './forca/config';
import { validateWord } from './forca/lib/hangman';
import { validateConfig as cacaValidate } from './cacapalavras/config';
import { validateConfig as quizValidate } from './quiz/config';
import { wordCount } from './quiz/lib/quiz';
import { LEVELS, LEVEL_LABEL, type Level } from './ai/types';
import type { GameType, ItemResult } from './types';
import { validateGameConfig } from './validate';

export { LEVELS, LEVEL_LABEL, type Level };

export const isLevel = (x: unknown): x is Level => (LEVELS as readonly unknown[]).includes(x);

// Ajuste fino da regra (fácil de mudar num lugar só)
export const ADAPTIVE_PARAMS = {
  accuracyWeight: 0.7, // o resto (0,3) é o ritmo
  slowRatio: 3, // ritmo zera quando o item leva 3× o tempo esperado
  guessRatio: 0.35, // erro em menos de 35% do tempo esperado = chute
  guessPenalty: 20, // desconto máximo por chutes (todos os itens chutados)
  checkPenalty: 3, // por "Verificar" (cruzadas)
  maxCheckPenalty: 15,
  hintPenalty: 3, // por pedido de ajuda ao tutor IA (a nota em pontos não muda)
  maxHintPenalty: 15,
  upAt: 80, // desempenho ≥ 80: sinal para subir
  jumpUpAt: 90, // ≥ 90: sobe na hora
  downBelow: 50, // < 50: sinal para descer
  jumpDownBelow: 35, // < 35: desce na hora
  signalsToMove: 2, // sinais seguidos na mesma direção para mudar de nível
} as const;

// ---------- tempo esperado por item ----------

const round1 = (x: number) => Math.round(x * 10) / 10;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// Segundos esperados para um aluno que domina o conteúdo resolver cada item (na ordem dos itens)
export function expectedSeconds(type: GameType, raw: unknown): number[] {
  switch (type) {
    case 'QUIZ': {
      const c = quizValidate(raw);
      // leitura do enunciado e das alternativas + tempo para pensar
      return c ? c.questions.map((q) => 6 + 0.3 * (wordCount(q.text) + q.options.reduce((n, o) => n + wordCount(o), 0))) : [];
    }
    case 'FORCA': {
      const c = forcaValidate(raw);
      if (!c) return [];
      return c.words.map((w) => {
        const v = validateWord(w);
        const letters = v.ok ? new Set(v.secret.base.replace(/[ -]/g, '')).size : 8;
        return 6 + 2 * letters;
      });
    }
    case 'CACA_PALAVRAS': {
      const c = cacaValidate(raw);
      return c ? generate(c).placements.map((p) => 10 + 0.8 * p.display.length) : [];
    }
    case 'CRUZADAS': {
      const c = cruzValidate(raw);
      // ler a dica + digitar as letras
      return c ? c.layout.words.map((w) => 6 + 2.5 * w.answer.length) : [];
    }
    case 'COMPLETE_FRASES': {
      const c = frasesValidate(raw);
      if (!c) return [];
      return c.sentences.flatMap((s) => {
        const words = wordCount(s.segments.join(' '));
        return s.answers.map(() => 6 + (0.3 * words) / s.answers.length);
      });
    }
  }
}

// ---------- desempenho de uma partida ----------

export interface PerformanceInput {
  score: number;
  maxScore: number;
  durationSeconds?: number | null;
  details?: Record<string, unknown> | null;
  hints?: number; // pedidos de ajuda ao tutor IA nesta partida (contados pelo servidor)
}

export interface Performance {
  score: number; // 0–100 (o "desempenho")
  accuracy: number; // 0–100
  speed: number | null; // 0–100 (null = sem itens acertados para medir)
  items: number;
  avgSecondsPerItem: number | null;
  guesses: number; // itens chutados
  errors: number; // tentativas erradas (letras, seleções)
  checks: number; // "Verificar" (cruzadas)
  hints: number; // pedidos de ajuda ao tutor IA
  trend: number | null; // acerto da 2ª metade − 1ª metade (pontos percentuais)
  penalties: number; // pontos descontados
  basis: 'items' | 'score'; // 'score' = jogo sem itens (versão antiga): só a nota
}

function readItems(details: Record<string, unknown> | null | undefined): ItemResult[] | null {
  const raw = details?.items;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 200) return null;
  const items: ItemResult[] = [];
  for (const it of raw) {
    if (typeof it !== 'object' || it === null) return null;
    const o = it as Record<string, unknown>;
    const correct = Number(o.correct);
    const seconds = Number(o.seconds);
    if (!Number.isFinite(correct) || !Number.isFinite(seconds) || seconds < 0) return null;
    const errors = o.errors === undefined ? undefined : Number(o.errors);
    items.push({
      correct: clamp01(correct),
      seconds: Math.min(seconds, 3600),
      ...(errors !== undefined && Number.isFinite(errors) ? { errors: Math.max(0, Math.round(errors)) } : {}),
    });
  }
  return items;
}

export function measurePerformance(type: GameType, config: unknown, r: PerformanceInput): Performance {
  const p = ADAPTIVE_PARAMS;
  const items = readItems(r.details);
  const checks = Math.max(0, Math.round(Number(r.details?.checks ?? 0)) || 0);
  const checkPenalty = Math.min(p.maxCheckPenalty, checks * p.checkPenalty);
  const hints = Math.max(0, Math.round(Number(r.hints ?? 0)) || 0);
  const hintPenalty = Math.min(p.maxHintPenalty, hints * p.hintPenalty);

  if (!items) {
    const accuracy = r.maxScore > 0 ? clamp01(r.score / r.maxScore) * 100 : 0;
    const score = Math.round(Math.max(0, accuracy - checkPenalty - hintPenalty));
    return {
      score,
      accuracy: Math.round(accuracy),
      speed: null,
      items: 0,
      avgSecondsPerItem: null,
      guesses: 0,
      errors: 0,
      checks,
      hints,
      trend: null,
      penalties: checkPenalty + hintPenalty,
      basis: 'score',
    };
  }

  const expected = expectedSeconds(type, config);
  const exp = (i: number) => expected[i] ?? expected[expected.length - 1] ?? 15;

  const accuracy = items.reduce((s, it) => s + it.correct, 0) / items.length;

  // ritmo: só itens acertados (resposta rápida e errada não é mérito)
  const paced = items
    .map((it, i) => ({ it, ratio: it.seconds / exp(i) }))
    .filter(({ it }) => it.correct >= 0.5)
    .map(({ it, ratio }) => {
      const f = ratio <= 1 ? 1 : ratio >= p.slowRatio ? 0 : 1 - (ratio - 1) / (p.slowRatio - 1);
      return f * it.correct;
    });
  const speed = paced.length ? paced.reduce((a, b) => a + b, 0) / paced.length : null;

  const guesses = items.filter((it, i) => it.correct === 0 && it.seconds > 0 && it.seconds < exp(i) * p.guessRatio).length;
  const guessPenalty = Math.round((p.guessPenalty * guesses) / items.length);
  const errors = items.reduce((s, it) => s + (it.errors ?? 0), 0);

  const half = Math.floor(items.length / 2);
  const mean = (xs: ItemResult[]) => xs.reduce((s, it) => s + it.correct, 0) / xs.length;
  const trend = half >= 2 ? Math.round((mean(items.slice(items.length - half)) - mean(items.slice(0, half))) * 100) : null;

  const base = 100 * (p.accuracyWeight * accuracy + (1 - p.accuracyWeight) * (speed ?? 0));
  const penalties = guessPenalty + checkPenalty + hintPenalty;
  return {
    score: Math.round(Math.min(100, Math.max(0, base - penalties))),
    accuracy: Math.round(accuracy * 100),
    speed: speed === null ? null : Math.round(speed * 100),
    items: items.length,
    avgSecondsPerItem: round1(items.reduce((s, it) => s + it.seconds, 0) / items.length),
    guesses,
    errors,
    checks,
    hints,
    trend,
    penalties,
    basis: 'items',
  };
}

// ---------- regra de nível ----------

export interface LevelState {
  level: Level;
  streak: number; // > 0: sinais seguidos para subir; < 0: para descer
}

export type LevelChange = 'up' | 'down' | null;

export interface LevelDecision extends LevelState {
  change: LevelChange;
  reason: string; // explicação curta (aparece no histórico do instrutor)
}

const shift = (level: Level, by: 1 | -1): Level => LEVELS[Math.min(LEVELS.length - 1, Math.max(0, LEVELS.indexOf(level) + by))];

export function nextLevel(state: LevelState, performance: number, locked = false): LevelDecision {
  const p = ADAPTIVE_PARAMS;
  const { level } = state;
  if (locked) return { level, streak: 0, change: null, reason: 'Nível fixado pelo instrutor' };

  const move = (dir: 1 | -1, reason: string): LevelDecision => {
    const to = shift(level, dir);
    if (to === level) {
      return {
        level,
        streak: 0,
        change: null,
        reason: dir > 0 ? 'Já está no nível mais difícil' : 'Já está no nível mais fácil',
      };
    }
    return { level: to, streak: 0, change: dir > 0 ? 'up' : 'down', reason };
  };

  if (performance >= p.jumpUpAt) return move(1, `Desempenho excelente (${performance})`);
  if (performance < p.jumpDownBelow) return move(-1, `Desempenho muito baixo (${performance})`);
  if (performance >= p.upAt) {
    const streak = Math.max(0, state.streak) + 1;
    if (streak >= p.signalsToMove) return move(1, `${streak} desempenhos bons seguidos`);
    return { level, streak, change: null, reason: `Bom desempenho (${performance}): mais um para subir` };
  }
  if (performance < p.downBelow) {
    const streak = Math.min(0, state.streak) - 1;
    if (-streak >= p.signalsToMove) return move(-1, `${-streak} desempenhos baixos seguidos`);
    return { level, streak, change: null, reason: `Desempenho baixo (${performance}): mais um para descer` };
  }
  return { level, streak: 0, change: null, reason: `Desempenho adequado ao nível (${performance})` };
}

// Nível inicial de quem ainda não jogou este tipo de jogo: a média dos níveis que o aluno já tem
// nos outros jogos (arredondada); sem histórico, Normal.
export function initialLevel(otherLevels: Level[]): Level {
  if (otherLevels.length === 0) return 'normal';
  const avg = otherLevels.reduce((s, l) => s + LEVELS.indexOf(l), 0) / otherLevels.length;
  return LEVELS[Math.round(avg)];
}

// ---------- jogo com 3 níveis (bloco adaptativo) ----------

export type LevelConfigs = Partial<Record<Level, unknown>>;

// Valida as configs de cada nível (pelo menos 2 níveis). null = inválido.
export function validateLevels(type: GameType, raw: unknown): LevelConfigs | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const out: LevelConfigs = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isLevel(k)) return null;
    if (v === null || v === undefined) continue;
    const c = validateGameConfig(type, v);
    if (c === null) return null;
    out[k] = c;
  }
  return Object.keys(out).length >= 2 ? out : null;
}

// Nível disponível mais próximo do desejado (o instrutor pode ter montado só 2 níveis)
export function pickLevel(levels: LevelConfigs, wanted: Level): Level {
  if (levels[wanted] !== undefined) return wanted;
  const order: Record<Level, Level[]> = {
    easy: ['normal', 'hard'],
    normal: ['easy', 'hard'],
    hard: ['normal', 'easy'],
  };
  return order[wanted].find((l) => levels[l] !== undefined) ?? wanted;
}

export const availableLevels = (levels: LevelConfigs): Level[] => LEVELS.filter((l) => levels[l] !== undefined);

// "Redes — Normal" -> "Redes" (os jogos gerados pela IA levam o nível no título)
export const baseTitle = (title: string): string =>
  title.replace(/\s*[—–-]\s*(Fácil|Normal|Difícil)\s*$/i, '').trim() || title;
