// scoring.ts — pontuação por lacuna certa (sem bônus de tempo: o aluno envia uma vez só)
import { normalizeWord, type Sentence } from './sentences';

export const POINTS_PER_BLANK = 10;

export interface FrasesScore {
  score: number;
  max: number;
  percent: number; // 0–100
  correct: number;
  total: number;
  results: boolean[]; // uma posição por lacuna, na ordem das frases
}

// filled[i] = palavra colocada na lacuna i (todas as lacunas, na ordem das frases)
export function frasesScore(sentences: Sentence[], filled: (string | null)[]): FrasesScore {
  const answers = sentences.flatMap((s) => s.answers);
  const results = answers.map((a, i) => filled[i] != null && normalizeWord(filled[i]!) === normalizeWord(a));
  const correct = results.filter(Boolean).length;
  const total = answers.length;
  const max = total * POINTS_PER_BLANK;
  const score = correct * POINTS_PER_BLANK;
  return { score, max, percent: max === 0 ? 0 : Math.round((score / max) * 100), correct, total, results };
}
