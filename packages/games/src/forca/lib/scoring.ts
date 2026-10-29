// scoring.ts — fórmula de pontuação (pura, fácil de ajustar)

export interface ScoreParams {
  base: number;           // pontos de uma palavra acertada sem erros
  penaltyPerError: number; // desconto por letra errada
  maxTimeBonus: number;    // bônus máximo por rapidez
  bonusWindowSec: number;  // em quantos segundos o bônus chega a zero
}

export const DEFAULT_PARAMS: ScoreParams = {
  base: 100,
  penaltyPerError: 15,
  maxTimeBonus: 50,
  bonusWindowSec: 60,
};

export interface WordResult {
  word: string;    // palavra exibida
  won: boolean;
  errors: number;  // letras erradas
  seconds: number; // tempo gasto nessa palavra
}

export const maxWordScore = (p: ScoreParams = DEFAULT_PARAMS) => p.base + p.maxTimeBonus;

// Palavra perdida vale 0. Acertada: base - penalidade por erro (nunca negativa) + bônus de tempo.
export function wordScore(r: WordResult, p: ScoreParams = DEFAULT_PARAMS): number {
  if (!r.won) return 0;
  const accuracy = Math.max(0, p.base - p.penaltyPerError * r.errors);
  const timeBonus = Math.round(p.maxTimeBonus * Math.max(0, 1 - r.seconds / p.bonusWindowSec));
  return accuracy + timeBonus;
}

export interface GameScore {
  total: number;
  max: number;
  percent: number; // 0–100, arredondado
  stars: 0 | 1 | 2 | 3;
  totalSeconds: number;
  totalErrors: number;
  wordsWon: number;
}

export function stars(percent: number): 0 | 1 | 2 | 3 {
  if (percent >= 80) return 3;
  if (percent >= 50) return 2;
  if (percent >= 20) return 1;
  return 0;
}

export function gameScore(results: WordResult[], p: ScoreParams = DEFAULT_PARAMS): GameScore {
  const total = results.reduce((s, r) => s + wordScore(r, p), 0);
  const max = results.length * maxWordScore(p);
  const percent = max === 0 ? 0 : Math.round((total / max) * 100);
  return {
    total,
    max,
    percent,
    stars: stars(percent),
    totalSeconds: results.reduce((s, r) => s + r.seconds, 0),
    totalErrors: results.reduce((s, r) => s + r.errors, 0),
    wordsWon: results.filter((r) => r.won).length,
  };
}
