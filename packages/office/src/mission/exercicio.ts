// Fase 2, missão 5: o exercício surpresa do curso, que chega pelo celular. Este arquivo não depende de React nem do
// Phaser (testado com vitest).
import type { GameResult } from '@playground/games';

/** Quanto do quiz precisa acertar para o exercício valer (70%). */
export const PASS_RATIO = 0.7;

export interface ExerciseCheck {
  passed: boolean;
  right: number;
  total: number;
  /** Quantas certas precisa para passar. */
  needed: number;
}

/** Confere o quiz do exercício: passa com pelo menos 70% das perguntas certas. */
export function checkExercise(result: GameResult): ExerciseCheck {
  const right = Number(result.details.correct) || 0;
  const total = Number(result.details.total) || 0;
  const needed = Math.ceil(total * PASS_RATIO - 1e-9);
  return { passed: total > 0 && right >= needed, right, total, needed };
}

