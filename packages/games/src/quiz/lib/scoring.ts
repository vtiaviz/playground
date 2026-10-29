// scoring.ts — pontuação por acertos e tempo total (pura, fácil de ajustar)
import { wordCount, type Question } from './quiz';

export interface ScoreParams {
  pointsPerCorrect: number;      // pontos por resposta certa
  maxTimeBonusPerCorrect: number; // bônus máximo de tempo por resposta certa
  baseSecondsPerQuestion: number; // tempo de referência: base por pergunta...
  secondsPerWord: number;         // ...mais isto por palavra (enunciado + alternativas)
  slowFactor: number;             // o bônus chega a zero em referência × slowFactor
}

export const DEFAULT_PARAMS: ScoreParams = {
  pointsPerCorrect: 100,
  maxTimeBonusPerCorrect: 50,
  baseSecondsPerQuestion: 5,
  secondsPerWord: 0.25,
  slowFactor: 4,
};

// Tempo de leitura estimado: perguntas longas (ou com código) ganham mais tempo de referência
export function referenceSeconds(questions: Question[], p: ScoreParams = DEFAULT_PARAMS): number {
  return questions.reduce((sum, q) => {
    const words = wordCount(q.text) + q.options.reduce((n, o) => n + wordCount(o), 0);
    return sum + p.baseSecondsPerQuestion + p.secondsPerWord * words;
  }, 0);
}

// 1 dentro do tempo de referência, 0 a partir de referência × slowFactor, linear no meio
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

export interface QuizScore {
  score: number;
  max: number;
  percent: number; // 0–100
  correct: number;
  total: number;
  seconds: number;
  referenceSeconds: number;
  timeFactor: number;
  accuracyPoints: number;
  timeBonus: number;
  stars: 0 | 1 | 2 | 3;
}

// results[i] = acertou a pergunta i? Só quem acerta ganha o bônus de tempo.
export function quizScore(
  results: boolean[],
  seconds: number,
  reference: number,
  p: ScoreParams = DEFAULT_PARAMS,
): QuizScore {
  const total = results.length;
  const correct = results.filter(Boolean).length;
  const factor = timeFactor(seconds, reference, p);

  const accuracyPoints = correct * p.pointsPerCorrect;
  const timeBonus = Math.round(correct * p.maxTimeBonusPerCorrect * factor);
  const score = accuracyPoints + timeBonus;
  const max = total * (p.pointsPerCorrect + p.maxTimeBonusPerCorrect);
  const percent = max === 0 ? 0 : Math.round((score / max) * 100);

  return {
    score, max, percent, correct, total, seconds,
    referenceSeconds: reference,
    timeFactor: factor,
    accuracyPoints, timeBonus,
    stars: stars(percent),
  };
}
