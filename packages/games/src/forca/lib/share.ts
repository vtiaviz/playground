import LZString from 'lz-string';
import { validateWord } from './hangman';

export const WORD_COUNT = 5;

export interface GameConfig {
  title: string;
  theme: string;   // tema único do jogo, exibido como dica (pode ser vazio)
  words: string[]; // exatamente WORD_COUNT palavras
}

// Config -> texto curto para o hash da URL
export function encodeGame(cfg: GameConfig): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(cfg));
}

// Hash da URL -> config validada (ou null se inválida/corrompida)
export function decodeGame(hash: string): GameConfig | null {
  try {
    const raw = LZString.decompressFromEncodedURIComponent(hash.replace(/^#/, ''));
    if (!raw) return null;
    const d = JSON.parse(raw);

    if (!Array.isArray(d.words) || d.words.length !== WORD_COUNT) return null;
    if (!d.words.every((w: unknown) => typeof w === 'string' && validateWord(w).ok)) return null;

    return {
      title: typeof d.title === 'string' && d.title.trim() ? d.title.slice(0, 80) : 'Jogo da forca',
      theme: typeof d.theme === 'string' ? d.theme.slice(0, 80) : '',
      words: d.words,
    };
  } catch {
    return null;
  }
}
