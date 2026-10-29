// generator.ts — núcleo do gerador de caça-palavras (sem dependências)
// A mesma entrada (palavras + opções + seed) gera sempre a mesma grade.

export type Dir = [number, number]; // [linha, coluna]

const DIRS_SIMPLE: Dir[] = [[0, 1], [1, 0]];
const DIRS_ALL: Dir[] = [
  [0, 1], [1, 0], [1, 1], [-1, 1],
  [0, -1], [-1, 0], [-1, -1], [1, -1],
];

export interface Options {
  words: string[];
  seed: number;
  size?: number;                  // se omitido, calcula automaticamente
  directions?: 'simple' | 'all';  // simple = →/↓ ; all = 8 direções
}

export interface Cell {
  base: string;   // letra sem acento (usada para comparar)
  shown: string;  // letra exibida (pode ter acento)
}

export interface Placement {
  display: string; // palavra como exibida na lista (ex.: "ÓLEOS")
  base: string;    // palavra sem acento (ex.: "OLEOS")
  row: number;
  col: number;
  dr: number;
  dc: number;
}

export interface Puzzle {
  size: number;
  grid: Cell[][];
  placements: Placement[];
  skipped: string[]; // palavras que não couberam
}

// PRNG determinístico
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const baseOf = (c: string) => c.normalize('NFD')[0];

function parseWords(words: string[]) {
  const seen = new Set<string>();
  const out: { display: string; bases: string[] }[] = [];
  for (const w of words) {
    const chars = [...w.toUpperCase()].filter((c) => /\p{L}/u.test(c));
    const bases = chars.map(baseOf);
    const key = bases.join('');
    if (bases.length < 3 || seen.has(key)) continue;
    seen.add(key);
    out.push({ display: chars.join(''), bases });
  }
  return out.sort((a, b) => b.bases.length - a.bases.length);
}

function build(
  size: number,
  entries: ReturnType<typeof parseWords>,
  dirs: Dir[],
  rand: () => number,
) {
  const grid: (Cell | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
  const placements: Placement[] = [];
  const skipped: string[] = [];

  for (const e of entries) {
    const n = e.bases.length;
    let placed = false;

    for (let attempt = 0; attempt < 300 && !placed; attempt++) {
      const [dr, dc] = dirs[Math.floor(rand() * dirs.length)];
      const row = Math.floor(rand() * size);
      const col = Math.floor(rand() * size);
      const endR = row + dr * (n - 1);
      const endC = col + dc * (n - 1);
      if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue;

      let ok = true;
      for (let i = 0; i < n && ok; i++) {
        const cell = grid[row + dr * i][col + dc * i];
        if (cell && cell.base !== e.bases[i]) ok = false;
      }
      if (!ok) continue;

      const chars = [...e.display];
      for (let i = 0; i < n; i++) {
        grid[row + dr * i][col + dc * i] = { base: e.bases[i], shown: chars[i] };
      }
      placements.push({ display: e.display, base: e.bases.join(''), row, col, dr, dc });
      placed = true;
    }
    if (!placed) skipped.push(e.display);
  }
  return { grid, placements, skipped };
}

export function generate(opts: Options): Puzzle {
  const rand = mulberry32(opts.seed);
  const entries = parseWords(opts.words);
  const dirs = opts.directions === 'all' ? DIRS_ALL : DIRS_SIMPLE;

  const longest = entries[0]?.bases.length ?? 0;
  const total = entries.reduce((s, e) => s + e.bases.length, 0);
  const autoSize = Math.max(longest, Math.ceil(Math.sqrt(total * 1.6)), 8);

  let size = opts.size ?? autoSize;
  let result = build(size, entries, dirs, rand);

  // No modo automático, aumenta a grade até caberem todas (limite: +6)
  if (opts.size === undefined) {
    while (result.skipped.length > 0 && size < autoSize + 6) {
      size++;
      result = build(size, entries, dirs, rand);
    }
  }

  // Preenche as células vazias
  const alphabet = 'ABCDEFGHIJLMNOPQRSTUVXZ';
  const wordLetters = entries.flatMap((e) => e.bases);
  const filler = () =>
    rand() < 0.5 && wordLetters.length
      ? wordLetters[Math.floor(rand() * wordLetters.length)]
      : alphabet[Math.floor(rand() * alphabet.length)];

  const grid: Cell[][] = result.grid.map((row) =>
    row.map((c) => c ?? (() => { const l = filler(); return { base: l, shown: l }; })()),
  );

  return { size, grid, placements: result.placements, skipped: result.skipped };
}

// Verifica uma seleção do jogador (de uma célula a outra), em qualquer sentido
export function matchSelection(
  puzzle: Puzzle,
  r1: number, c1: number, r2: number, c2: number,
): Placement | null {
  return (
    puzzle.placements.find((p) => {
      const er = p.row + p.dr * (p.base.length - 1);
      const ec = p.col + p.dc * (p.base.length - 1);
      return (
        (p.row === r1 && p.col === c1 && er === r2 && ec === c2) ||
        (p.row === r2 && p.col === c2 && er === r1 && ec === c1)
      );
    }) ?? null
  );
}
