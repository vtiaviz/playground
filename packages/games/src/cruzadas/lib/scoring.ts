// scoring.ts — pontuação por tempo de conclusão (pura, fácil de ajustar)

export interface ScoreParams {
  maxScore: number;           // pontuação máxima
  minScore: number;           // pontuação mínima (quem termina nunca zera)
  secondsPerCell: number;     // tempo de referência = células × isto
  slowFactor: number;         // a pontuação chega ao mínimo em referência × slowFactor
  checkPenaltySeconds: number; // segundos somados ao tempo a cada "Verificar" (0 = sem custo)
}

export const DEFAULT_PARAMS: ScoreParams = {
  maxScore: 1000,
  minScore: 100,
  secondsPerCell: 3,
  slowFactor: 4,
  checkPenaltySeconds: 0,
};

export const referenceSeconds = (cells: number, p: ScoreParams = DEFAULT_PARAMS) =>
  cells * p.secondsPerCell;

// Dentro do tempo de referência: máximo. Depois, cai linearmente até o mínimo.
export function timeScore(
  seconds: number,
  cells: number,
  checks = 0,
  p: ScoreParams = DEFAULT_PARAMS,
): number {
  const effective = seconds + checks * p.checkPenaltySeconds;
  const ref = referenceSeconds(cells, p);
  const slowest = ref * p.slowFactor;

  if (effective <= ref) return p.maxScore;
  if (effective >= slowest) return p.minScore;
  const t = (effective - ref) / (slowest - ref);
  return Math.round(p.maxScore - (p.maxScore - p.minScore) * t);
}

export function stars(score: number): 0 | 1 | 2 | 3 {
  if (score >= 800) return 3;
  if (score >= 500) return 2;
  if (score >= 250) return 1;
  return 0;
}

export interface CrosswordScore {
  score: number;
  max: number;
  seconds: number;          // tempo real jogado
  effectiveSeconds: number; // tempo + penalidades
  referenceSeconds: number;
  checks: number;
  stars: 0 | 1 | 2 | 3;
}

export function crosswordScore(
  seconds: number,
  cells: number,
  checks = 0,
  p: ScoreParams = DEFAULT_PARAMS,
): CrosswordScore {
  const score = timeScore(seconds, cells, checks, p);
  return {
    score,
    max: p.maxScore,
    seconds,
    effectiveSeconds: seconds + checks * p.checkPenaltySeconds,
    referenceSeconds: referenceSeconds(cells, p),
    checks,
    stars: stars(score),
  };
}
