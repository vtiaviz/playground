import { validateWord } from './lib/hangman';
import { maxWordScore } from './lib/scoring';

export const WORD_COUNT = 5;

export interface GameConfig {
  title: string;
  theme: string; // tema único do jogo, exibido como dica (pode ser vazio)
  words: string[]; // exatamente WORD_COUNT palavras
}

export function validateConfig(raw: unknown): GameConfig | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const d = raw as Record<string, unknown>;

  if (!Array.isArray(d.words) || d.words.length !== WORD_COUNT) return null;
  if (!d.words.every((w: unknown) => typeof w === 'string' && validateWord(w).ok)) return null;

  return {
    title: typeof d.title === 'string' && d.title.trim() ? d.title.trim().slice(0, 80) : 'Jogo da forca',
    theme: typeof d.theme === 'string' ? d.theme.trim().slice(0, 80) : '',
    words: (d.words as string[]).map((w) => w.trim()),
  };
}

export const maxScore = (c: GameConfig): number => c.words.length * maxWordScore();

export const summarize = (c: GameConfig): string => `${c.words.length} palavras`;
