// scoring.ts — pontuação do caça-palavras: acertos + bônus de tempo (puro, fácil de ajustar).
// Mesma ideia do quiz: cada palavra vale `pointsPerWord`, mais um bônus de até `maxTimeBonusPerWord`
// se o jogo terminar dentro do tempo de referência; o bônus cai a zero em referência × slowFactor.

export interface ScoreParams {
  pointsPerWord: number;
  maxTimeBonusPerWord: number;
  secondsPerWord: number; // tempo de referência = palavras × isto
  slowFactor: number;
}

export const DEFAULT_PARAMS: ScoreParams = {
  pointsPerWord: 100,
  maxTimeBonusPerWord: 50,
  secondsPerWord: 15,
  slowFactor: 4,
};

export const referenceSeconds = (words: number, p: ScoreParams = DEFAULT_PARAMS) => words * p.secondsPerWord;

export const maxScore = (words: number, p: ScoreParams = DEFAULT_PARAMS) =>
  words * (p.pointsPerWord + p.maxTimeBonusPerWord);

export function timeFactor(seconds: number, reference: number, p: ScoreParams = DEFAULT_PARAMS): number {
  const slowest = reference * p.slowFactor;
  if (seconds <= reference) return 1;
  if (seconds >= slowest) return 0;
  return 1 - (seconds - reference) / (slowest - reference);
}

export function stars(percent: number): 0 | 1 | 2 | 3 {
  if (percent >= 80) return 3;
  if (percent >= 50) return 2;
  if (percent >= 20) return 1;
  return 0;
}

export interface WordSearchScore {
  score: number;
  max: number;
  percent: number;
  seconds: number;
  referenceSeconds: number;
  timeBonus: number;
  stars: 0 | 1 | 2 | 3;
}

// O jogo só termina quando TODAS as palavras foram achadas, então os acertos sempre valem o máximo
export function wordSearchScore(words: number, seconds: number, p: ScoreParams = DEFAULT_PARAMS): WordSearchScore {
  const reference = referenceSeconds(words, p);
  const timeBonus = Math.round(words * p.maxTimeBonusPerWord * timeFactor(seconds, reference, p));
  const score = words * p.pointsPerWord + timeBonus;
  const max = maxScore(words, p);
  const percent = max === 0 ? 0 : Math.round((score / max) * 100);
  return { score, max, percent, seconds, referenceSeconds: reference, timeBonus, stars: stars(percent) };
}
