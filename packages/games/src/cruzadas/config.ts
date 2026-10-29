import { validateLayout, type Layout } from './lib/crossword';
import { DEFAULT_PARAMS } from './lib/scoring';

export interface GameConfig {
  title: string;
  layout: Layout;
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;

// Aceita o que veio do banco/rede e devolve uma config normalizada (ou null).
// O layout é revalidado: nada de palavras fora da grade nem letras conflitantes.
export function validateConfig(raw: unknown): GameConfig | null {
  if (!isObj(raw) || !isObj(raw.layout) || !Array.isArray(raw.layout.words)) return null;

  const layout = validateLayout(
    raw.layout.words.map((w: unknown) =>
      isObj(w)
        ? { answer: w.answer, clue: w.clue, row: w.row, col: w.col, dir: w.dir }
        : { answer: null, clue: null, row: null, col: null, dir: null },
    ),
  );
  if (!layout) return null;

  const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim().slice(0, 80) : 'Palavras cruzadas';
  return { title, layout };
}

export const maxScore = (): number => DEFAULT_PARAMS.maxScore;

export const summarize = (c: GameConfig): string => `${c.layout.words.length} palavras`;
