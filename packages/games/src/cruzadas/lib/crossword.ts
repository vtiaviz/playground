// crossword.ts — lógica pura de palavras cruzadas (sem React, sem DOM)

export const MIN_LETTERS = 3;
export const MAX_LETTERS = 20;
export const MAX_ENTRIES = 30;
export const MAX_CLUE = 140;
export const MAX_SIZE = 40; // linhas e colunas

export type Dir = 'across' | 'down';

export interface Entry {
  answer: string; // A–Z, sem acentos
  clue: string;
}

export interface PlacedWord extends Entry {
  number: number; // número da dica (compartilhado entre horizontal e vertical que começam na mesma célula)
  row: number;
  col: number;
  dir: Dir;
}

export interface Layout {
  rows: number;
  cols: number;
  words: PlacedWord[]; // ordenadas por número (horizontal antes de vertical)
}

// ---------- letras ----------

// Letra digitada -> A–Z (ou null). Teclas como "Enter" têm mais de um caractere e são ignoradas.
export function normalizeLetter(input: string): string | null {
  if ([...input].length !== 1) return null;
  const b = input.normalize('NFD')[0].toUpperCase();
  return /^[A-Z]$/.test(b) ? b : null;
}

// "Água" -> "AGUA"; null se tiver qualquer coisa que não seja letra
export function normalizeAnswer(raw: string): string | null {
  let out = '';
  for (const ch of raw.normalize('NFC')) {
    const b = normalizeLetter(ch);
    if (!b) return null;
    out += b;
  }
  return out;
}

// ---------- entrada do editor: "resposta dica", uma por linha ----------

export interface LineError {
  line: number; // 1-based; 0 = erro geral
  message: string;
}

export function parseEntries(text: string): { entries: Entry[]; errors: LineError[] } {
  const entries: Entry[] = [];
  const errors: LineError[] = [];
  const seen = new Set<string>();

  text.split(/\r?\n/).forEach((raw, idx) => {
    const line = idx + 1;
    const trimmed = raw.trim();
    if (!trimmed) return;

    if (/^\S+$/.test(trimmed)) {
      errors.push({ line, message: 'falta a dica (formato: resposta dica)' });
      return;
    }
    const m = /^(\S+)\s+(.+)$/.exec(trimmed)!;

    const answer = normalizeAnswer(m[1]);
    if (!answer) {
      errors.push({ line, message: `a resposta "${m[1]}" deve ter só letras (sem hífen, número ou símbolo)` });
      return;
    }
    if (answer.length < MIN_LETTERS) {
      errors.push({ line, message: `a resposta "${m[1]}" precisa de pelo menos ${MIN_LETTERS} letras` });
      return;
    }
    if (answer.length > MAX_LETTERS) {
      errors.push({ line, message: `a resposta "${m[1]}" passa de ${MAX_LETTERS} letras` });
      return;
    }
    if (seen.has(answer)) {
      errors.push({ line, message: `resposta repetida: "${m[1]}"` });
      return;
    }
    const clue = m[2].trim().replace(/\s+/g, ' ');
    if (clue.length > MAX_CLUE) {
      errors.push({ line, message: `a dica passa de ${MAX_CLUE} caracteres` });
      return;
    }

    seen.add(answer);
    entries.push({ answer, clue });
  });

  if (entries.length > MAX_ENTRIES) {
    errors.push({ line: 0, message: `máximo de ${MAX_ENTRIES} palavras (as demais foram ignoradas)` });
    entries.length = MAX_ENTRIES;
  }
  return { entries, errors };
}

// ---------- gerador de layout ----------

interface Raw extends Entry {
  row: number;
  col: number;
  dir: Dir;
}

interface Board {
  letters: Map<string, string>;
  across: Set<string>; // células ocupadas por alguma palavra horizontal
  down: Set<string>;
  words: Raw[];
  minR: number;
  maxR: number;
  minC: number;
  maxC: number;
}

const key = (r: number, c: number) => `${r},${c}`;

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function newBoard(): Board {
  return {
    letters: new Map(),
    across: new Set(),
    down: new Set(),
    words: [],
    minR: Infinity,
    maxR: -Infinity,
    minC: Infinity,
    maxC: -Infinity,
  };
}

// Extensão da caixa se a palavra fosse colocada
function boundsWith(b: Board, n: number, row: number, col: number, dir: Dir) {
  const endR = dir === 'down' ? row + n - 1 : row;
  const endC = dir === 'across' ? col + n - 1 : col;
  return {
    minR: Math.min(b.minR, row),
    maxR: Math.max(b.maxR, endR),
    minC: Math.min(b.minC, col),
    maxC: Math.max(b.maxC, endC),
  };
}

// Devolve o nº de cruzamentos se a palavra puder ser colocada, ou -1 se for inválido
function canPlace(b: Board, ans: string, row: number, col: number, dir: Dir): number {
  const n = ans.length;
  const dr = dir === 'down' ? 1 : 0;
  const dc = dir === 'across' ? 1 : 0;

  // antes e depois da palavra tem que estar vazio (senão ela viraria outra palavra maior)
  if (b.letters.has(key(row - dr, col - dc))) return -1;
  if (b.letters.has(key(row + dr * n, col + dc * n))) return -1;

  const box = boundsWith(b, n, row, col, dir);
  if (box.maxR - box.minR + 1 > MAX_SIZE || box.maxC - box.minC + 1 > MAX_SIZE) return -1;

  const same = dir === 'across' ? b.across : b.down;
  let crossings = 0;

  for (let k = 0; k < n; k++) {
    const r = row + dr * k;
    const c = col + dc * k;
    const existing = b.letters.get(key(r, c));
    if (existing !== undefined) {
      if (existing !== ans[k]) return -1;      // letras diferentes na mesma célula
      if (same.has(key(r, c))) return -1;      // sobreposição com palavra da mesma direção
      crossings++;
    } else if (b.letters.has(key(r + dc, c + dr)) || b.letters.has(key(r - dc, c - dr))) {
      return -1; // célula vazia encostada lateralmente numa letra: formaria palavra sem dica
    }
  }
  return crossings;
}

function place(b: Board, w: Entry, row: number, col: number, dir: Dir) {
  const dr = dir === 'down' ? 1 : 0;
  const dc = dir === 'across' ? 1 : 0;
  const set = dir === 'across' ? b.across : b.down;
  for (let k = 0; k < w.answer.length; k++) {
    const r = row + dr * k;
    const c = col + dc * k;
    b.letters.set(key(r, c), w.answer[k]);
    set.add(key(r, c));
  }
  const box = boundsWith(b, w.answer.length, row, col, dir);
  b.minR = box.minR; b.maxR = box.maxR; b.minC = box.minC; b.maxC = box.maxC;
  b.words.push({ answer: w.answer, clue: w.clue, row, col, dir });
}

interface Candidate {
  row: number;
  col: number;
  dir: Dir;
  crossings: number;
  area: number;
  skew: number;
}

function candidatesFor(b: Board, w: Entry): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();

  for (const p of b.words) {
    for (let i = 0; i < w.answer.length; i++) {
      for (let j = 0; j < p.answer.length; j++) {
        if (w.answer[i] !== p.answer[j]) continue;

        const dir: Dir = p.dir === 'across' ? 'down' : 'across';
        const row = p.dir === 'across' ? p.row - i : p.row + j;
        const col = p.dir === 'across' ? p.col + j : p.col - i;

        const id = `${row},${col},${dir}`;
        if (seen.has(id)) continue;
        seen.add(id);

        const crossings = canPlace(b, w.answer, row, col, dir);
        if (crossings < 1) continue;

        const box = boundsWith(b, w.answer.length, row, col, dir);
        const rows = box.maxR - box.minR + 1;
        const cols = box.maxC - box.minC + 1;
        out.push({ row, col, dir, crossings, area: rows * cols, skew: Math.abs(rows - cols) });
      }
    }
  }
  return out;
}

function pick(cands: Candidate[], rand: () => number): Candidate {
  // de vez em quando escolhe qualquer uma, para diversificar as tentativas
  if (rand() < 0.15) return cands[Math.floor(rand() * cands.length)];

  let best = [cands[0]];
  const cmp = (a: Candidate, c: Candidate) =>
    c.crossings - a.crossings || a.area - c.area || a.skew - c.skew;
  for (const c of cands.slice(1)) {
    const d = cmp(c, best[0]);
    if (d < 0) best = [c];
    else if (d === 0) best.push(c);
  }
  return best[Math.floor(rand() * best.length)];
}

function attempt(entries: Entry[], rand: () => number) {
  // mais longas primeiro, com um pouco de aleatoriedade
  const order = entries
    .map((e) => ({ e, k: e.answer.length + rand() * 4 }))
    .sort((a, c) => c.k - a.k)
    .map((x) => x.e);

  const board = newBoard();
  place(board, order[0], 0, 0, 'across');

  let pending = order.slice(1);
  let progress = true;
  while (pending.length > 0 && progress) {
    progress = false;
    const next: Entry[] = [];
    for (const w of pending) {
      const cands = candidatesFor(board, w);
      if (cands.length === 0) {
        next.push(w); // pode encaixar depois que outras palavras criarem novos pontos de cruzamento
        continue;
      }
      const c = pick(cands, rand);
      place(board, w, c.row, c.col, c.dir);
      progress = true;
    }
    pending = next;
  }
  return { board, unplaced: pending };
}

function quality(board: Board, unplaced: Entry[]) {
  const rows = board.maxR - board.minR + 1;
  const cols = board.maxC - board.minC + 1;
  const total = board.words.reduce((s, w) => s + w.answer.length, 0);
  return {
    unplaced: unplaced.length,
    area: rows * cols,
    crossings: total - board.letters.size,
    skew: Math.abs(rows - cols),
  };
}

function better(a: ReturnType<typeof quality>, b: ReturnType<typeof quality>) {
  return (
    a.unplaced - b.unplaced ||
    a.area - b.area ||
    b.crossings - a.crossings ||
    a.skew - b.skew
  ) < 0;
}

// Numera as palavras no padrão das cruzadas: varre linha a linha, e cada célula
// onde começa uma palavra ganha um número (horizontal e vertical compartilham)
function numberWords(raw: Raw[]): PlacedWord[] {
  const starts = [...new Set(raw.map((w) => key(w.row, w.col)))]
    .map((k) => k.split(',').map(Number) as [number, number])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const numberOf = new Map(starts.map(([r, c], i) => [key(r, c), i + 1]));

  return raw
    .map((w) => ({ ...w, number: numberOf.get(key(w.row, w.col))! }))
    .sort((a, b) => a.number - b.number || (a.dir === b.dir ? 0 : a.dir === 'across' ? -1 : 1));
}

export interface GenerateResult {
  layout: Layout;
  unplaced: Entry[]; // respostas que não conseguiram cruzar com nenhuma outra
}

export function generateLayout(
  entries: Entry[],
  opts: { seed: number; attempts?: number },
): GenerateResult {
  if (entries.length === 0) return { layout: { rows: 0, cols: 0, words: [] }, unplaced: [] };

  const rand = mulberry32(opts.seed);
  const attempts = opts.attempts ?? 200;

  let best: ReturnType<typeof attempt> | null = null;
  let bestQ: ReturnType<typeof quality> | null = null;

  for (let i = 0; i < attempts; i++) {
    const res = attempt(entries, rand);
    const q = quality(res.board, res.unplaced);
    if (!best || !bestQ || better(q, bestQ)) {
      best = res;
      bestQ = q;
    }
  }

  const { board, unplaced } = best!;
  const shifted: Raw[] = board.words.map((w) => ({ ...w, row: w.row - board.minR, col: w.col - board.minC }));
  return {
    layout: {
      rows: board.maxR - board.minR + 1,
      cols: board.maxC - board.minC + 1,
      words: numberWords(shifted),
    },
    unplaced,
  };
}

// ---------- validação de um layout vindo de fora (link compartilhado) ----------

export function validateLayout(
  words: { answer: unknown; clue: unknown; row: unknown; col: unknown; dir: unknown }[],
): Layout | null {
  if (words.length < 1 || words.length > MAX_ENTRIES) return null;

  const raw: Raw[] = [];
  const letters = new Map<string, string>();
  const across = new Set<string>();
  const down = new Set<string>();
  let maxR = 0;
  let maxC = 0;

  for (const w of words) {
    if (typeof w.answer !== 'string' || typeof w.clue !== 'string') return null;
    if (!/^[A-Z]+$/.test(w.answer) || w.answer.length < MIN_LETTERS || w.answer.length > MAX_LETTERS) return null;
    if (w.clue.length > MAX_CLUE) return null;
    if (!Number.isInteger(w.row) || !Number.isInteger(w.col)) return null;
    if (w.dir !== 'across' && w.dir !== 'down') return null;

    const row = w.row as number;
    const col = w.col as number;
    const dir = w.dir as Dir;
    const dr = dir === 'down' ? 1 : 0;
    const dc = dir === 'across' ? 1 : 0;
    const set = dir === 'across' ? across : down;

    for (let k = 0; k < w.answer.length; k++) {
      const r = row + dr * k;
      const c = col + dc * k;
      if (r < 0 || c < 0 || r >= MAX_SIZE || c >= MAX_SIZE) return null;
      const existing = letters.get(key(r, c));
      if (existing !== undefined && existing !== w.answer[k]) return null;
      if (set.has(key(r, c))) return null;
      letters.set(key(r, c), w.answer[k]);
      set.add(key(r, c));
      maxR = Math.max(maxR, r);
      maxC = Math.max(maxC, c);
    }
    raw.push({ answer: w.answer, clue: w.clue, row, col, dir });
  }

  return { rows: maxR + 1, cols: maxC + 1, words: numberWords(raw) };
}

// ---------- grade para o jogo ----------

export interface GridCell {
  letter: string;
  number: number | null;  // número exibido no canto da célula
  across: number | null;  // índice (em layout.words) da palavra horizontal que passa aqui
  down: number | null;    // idem, vertical
}

export function wordCells(w: Pick<PlacedWord, 'answer' | 'row' | 'col' | 'dir'>) {
  return [...w.answer].map((_, k) => ({
    row: w.row + (w.dir === 'down' ? k : 0),
    col: w.col + (w.dir === 'across' ? k : 0),
  }));
}

export function buildGrid(layout: Layout): (GridCell | null)[][] {
  const grid: (GridCell | null)[][] = Array.from({ length: layout.rows }, () =>
    Array<GridCell | null>(layout.cols).fill(null),
  );

  layout.words.forEach((w, index) => {
    wordCells(w).forEach(({ row, col }, k) => {
      const cell = grid[row][col] ?? { letter: w.answer[k], number: null, across: null, down: null };
      if (w.dir === 'across') cell.across = index;
      else cell.down = index;
      if (k === 0) cell.number = w.number;
      grid[row][col] = cell;
    });
  });
  return grid;
}

export interface Comparison {
  total: number;
  correct: number;
  wrong: { row: number; col: number }[];
  empty: number;
  solved: boolean;
}

// input[r][c] = '' ou uma letra A–Z digitada pelo jogador (células pretas são ignoradas)
export function compareInput(grid: (GridCell | null)[][], input: string[][]): Comparison {
  let total = 0;
  let correct = 0;
  let empty = 0;
  const wrong: { row: number; col: number }[] = [];

  grid.forEach((line, row) =>
    line.forEach((cell, col) => {
      if (!cell) return;
      total++;
      const typed = input[row]?.[col] ?? '';
      if (typed === '') empty++;
      else if (typed === cell.letter) correct++;
      else wrong.push({ row, col });
    }),
  );
  return { total, correct, wrong, empty, solved: total > 0 && correct === total };
}
