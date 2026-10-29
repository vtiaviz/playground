import { generate } from './lib/generator';
import { maxScore as maxScoreForWords } from './lib/scoring';

export interface GameConfig {
  title: string;
  words: string[];
  seed: number;
  size?: number;
  directions: 'simple' | 'all';
}

export const MAX_WORDS = 100;
export const MAX_WORD_LEN = 30;

export function validateConfig(raw: unknown): GameConfig | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const d = raw as Record<string, unknown>;

  if (!Array.isArray(d.words) || typeof d.seed !== 'number' || !Number.isFinite(d.seed)) return null;
  const words = d.words
    .filter((w: unknown): w is string => typeof w === 'string')
    .map((w) => w.slice(0, MAX_WORD_LEN))
    .slice(0, MAX_WORDS);
  if (words.length === 0) return null;

  const size = typeof d.size === 'number' && d.size >= 5 && d.size <= 40 ? d.size : undefined;
  const config: GameConfig = {
    title: typeof d.title === 'string' && d.title.trim() ? d.title.trim().slice(0, 80) : 'Caça-palavras',
    words,
    seed: d.seed,
    ...(size !== undefined ? { size } : {}),
    directions: d.directions === 'simple' ? 'simple' : 'all',
  };

  // precisa caber ao menos uma palavra na grade
  return generate(config).placements.length > 0 ? config : null;
}

// Quantas palavras realmente entram na grade depende do gerador (palavras curtas, repetidas
// ou que não cabem são descartadas), por isso a pontuação máxima parte do puzzle gerado.
export const maxScore = (c: GameConfig): number => maxScoreForWords(generate(c).placements.length);

export const summarize = (c: GameConfig): string => `${generate(c).placements.length} palavras`;
