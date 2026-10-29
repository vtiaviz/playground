import { MAX_QUESTIONS, isValidQuestion, type Question } from './lib/quiz';
import { DEFAULT_PARAMS } from './lib/scoring';

export interface GameConfig {
  title: string;
  questions: Question[];
}

export function validateConfig(raw: unknown): GameConfig | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const d = raw as Record<string, unknown>;
  if (!Array.isArray(d.questions) || d.questions.length < 1 || d.questions.length > MAX_QUESTIONS) return null;

  const questions: Question[] = [];
  for (const x of d.questions) {
    if (!isValidQuestion(x)) return null;
    questions.push({ text: x.text, options: [...x.options], correct: x.correct });
  }

  return {
    title: typeof d.title === 'string' && d.title.trim() ? d.title.trim().slice(0, 80) : 'Quiz',
    questions,
  };
}

export const maxScore = (c: GameConfig): number =>
  c.questions.length * (DEFAULT_PARAMS.pointsPerCorrect + DEFAULT_PARAMS.maxTimeBonusPerCorrect);

export const summarize = (c: GameConfig): string =>
  `${c.questions.length} ${c.questions.length === 1 ? 'questão' : 'questões'}`;
