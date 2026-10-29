import LZString from 'lz-string';
import { validateLayout, type Layout } from './crossword';

// O link guarda o LAYOUT já pronto (posição de cada palavra), não só as palavras.
// Assim, melhorar o gerador no futuro não muda as cruzadas já compartilhadas.
export interface GameConfig {
  title: string;
  layout: Layout;
}

type Packed = [answer: string, clue: string, row: number, col: number, dir: 0 | 1];

export function encodeGame(cfg: GameConfig): string {
  const w: Packed[] = cfg.layout.words.map((x) => [
    x.answer,
    x.clue,
    x.row,
    x.col,
    x.dir === 'across' ? 0 : 1,
  ]);
  return LZString.compressToEncodedURIComponent(JSON.stringify({ t: cfg.title, w }));
}

// Hash da URL -> config validada (ou null se inválida/adulterada)
export function decodeGame(hash: string): GameConfig | null {
  try {
    const raw = LZString.decompressFromEncodedURIComponent(hash.replace(/^#/, ''));
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!Array.isArray(d.w)) return null;

    const layout = validateLayout(
      d.w.map((x: unknown) => {
        if (!Array.isArray(x) || x.length !== 5) return { answer: null, clue: null, row: null, col: null, dir: null };
        return {
          answer: x[0],
          clue: x[1],
          row: x[2],
          col: x[3],
          dir: x[4] === 0 ? 'across' : x[4] === 1 ? 'down' : null,
        };
      }),
    );
    if (!layout) return null;

    return {
      title: typeof d.t === 'string' && d.t.trim() ? d.t.slice(0, 80) : 'Palavras cruzadas',
      layout,
    };
  } catch {
    return null;
  }
}
