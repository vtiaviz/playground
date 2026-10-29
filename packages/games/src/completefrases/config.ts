import {
  MAX_DECOYS,
  MAX_SENTENCES,
  isValidSentence,
  isValidWord,
  normalizeWord,
  type Sentence,
} from './lib/sentences';
import { POINTS_PER_BLANK } from './lib/scoring';

export interface GameConfig {
  title: string;
  sentences: Sentence[];
  decoys: string[]; // palavras a mais no banco, para confundir
}

export const blankCount = (c: Pick<GameConfig, 'sentences'>): number =>
  c.sentences.reduce((n, s) => n + s.answers.length, 0);

export function validateConfig(raw: unknown): GameConfig | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const d = raw as Record<string, unknown>;
  if (!Array.isArray(d.sentences) || d.sentences.length < 1 || d.sentences.length > MAX_SENTENCES) return null;

  const sentences: Sentence[] = [];
  for (const x of d.sentences) {
    if (!isValidSentence(x)) return null;
    sentences.push({ segments: [...x.segments], answers: x.answers.map((a) => a.trim()), explanation: x.explanation ?? '' });
  }

  const rawDecoys = d.decoys ?? [];
  if (!Array.isArray(rawDecoys) || rawDecoys.length > MAX_DECOYS || !rawDecoys.every(isValidWord)) return null;
  // uma pegadinha igual a uma resposta tornaria a correção ambígua
  const answers = new Set(sentences.flatMap((s) => s.answers.map(normalizeWord)));
  const decoys = rawDecoys.map((w) => w.trim());
  if (decoys.some((w) => answers.has(normalizeWord(w)))) return null;

  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  return {
    title: str(d.title, 80) || 'Complete as Frases',
    sentences,
    decoys,
  };
}

export const maxScore = (c: GameConfig): number => blankCount(c) * POINTS_PER_BLANK;

export const summarize = (c: GameConfig): string => {
  const n = c.sentences.length;
  const extra = c.decoys.length ? ` · ${c.decoys.length} ${c.decoys.length === 1 ? 'pegadinha' : 'pegadinhas'}` : '';
  return `${n} ${n === 1 ? 'frase' : 'frases'}${extra}`;
};
