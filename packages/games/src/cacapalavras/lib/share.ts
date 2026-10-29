import LZString from 'lz-string';

export interface GameConfig {
  title: string;
  words: string[];
  seed: number;
  size?: number;
  directions: 'simple' | 'all';
}

const MAX_WORDS = 100;
const MAX_WORD_LEN = 30;

// Config -> texto curto para colocar no hash da URL
export function encodeGame(cfg: GameConfig): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(cfg));
}

// Hash da URL -> config validada (ou null se estiver inválido/corrompido)
export function decodeGame(hash: string): GameConfig | null {
  try {
    const raw = LZString.decompressFromEncodedURIComponent(hash.replace(/^#/, ''));
    if (!raw) return null;
    const d = JSON.parse(raw);

    if (!Array.isArray(d.words) || typeof d.seed !== 'number') return null;
    const words = d.words
      .filter((w: unknown): w is string => typeof w === 'string')
      .map((w: string) => w.slice(0, MAX_WORD_LEN))
      .slice(0, MAX_WORDS);
    if (words.length === 0) return null;

    return {
      title: typeof d.title === 'string' ? d.title.slice(0, 80) : 'Caça-palavras',
      words,
      seed: d.seed,
      size: typeof d.size === 'number' && d.size >= 5 && d.size <= 40 ? d.size : undefined,
      directions: d.directions === 'simple' ? 'simple' : 'all',
    };
  } catch {
    return null;
  }
}
