// navigation.ts — seleção, digitação e navegação na grade (pura, sem React)
import { wordCells, type Dir, type GridCell, type Layout } from './crossword';

export interface Selection {
  row: number;
  col: number;
  dir: Dir;
}

type Grid = (GridCell | null)[][];

// Matriz linhas × colunas de letras digitadas ('' = vazia)
export const emptyInput = (layout: Layout): string[][] =>
  Array.from({ length: layout.rows }, () => Array<string>(layout.cols).fill(''));

// Seleciona uma palavra pela posição na lista de dicas (começa na primeira célula dela)
export function selectWord(layout: Layout, index: number): Selection {
  const w = layout.words[index];
  return { row: w.row, col: w.col, dir: w.dir };
}

export const initialSelection = (layout: Layout): Selection => selectWord(layout, 0);

// Índice (em layout.words) da palavra ativa, ou null
export function activeWordIndex(grid: Grid, sel: Selection): number | null {
  const cell = grid[sel.row]?.[sel.col];
  if (!cell) return null;
  return sel.dir === 'across' ? cell.across : cell.down;
}

// Clique numa célula: mantém a direção atual se possível; clicar de novo na mesma célula alterna.
// Retorna null para células vazias (sem letra).
export function selectCell(grid: Grid, current: Selection | null, row: number, col: number): Selection | null {
  const cell = grid[row]?.[col];
  if (!cell) return null;
  const hasAcross = cell.across !== null;
  const hasDown = cell.down !== null;

  if (current && current.row === row && current.col === col) {
    if (current.dir === 'across' && hasDown) return { row, col, dir: 'down' };
    if (current.dir === 'down' && hasAcross) return { row, col, dir: 'across' };
    return current;
  }

  const preferred: Dir = current?.dir ?? 'across';
  const dir: Dir = preferred === 'across' ? (hasAcross ? 'across' : 'down') : hasDown ? 'down' : 'across';
  return { row, col, dir };
}

function positionInWord(layout: Layout, grid: Grid, sel: Selection) {
  const idx = activeWordIndex(grid, sel);
  if (idx === null) return null;
  const cells = wordCells(layout.words[idx]);
  const pos = cells.findIndex((c) => c.row === sel.row && c.col === sel.col);
  return { cells, pos };
}

export interface Edit {
  input: string[][];
  selection: Selection;
}

// Escreve a letra na célula atual e avança para a próxima da palavra (no fim, fica onde está)
export function typeLetter(layout: Layout, grid: Grid, input: string[][], sel: Selection, letter: string): Edit {
  const next = input.map((r) => [...r]);
  next[sel.row][sel.col] = letter;

  const p = positionInWord(layout, grid, sel);
  let selection = sel;
  if (p && p.pos >= 0 && p.pos < p.cells.length - 1) {
    const n = p.cells[p.pos + 1];
    selection = { row: n.row, col: n.col, dir: sel.dir };
  }
  return { input: next, selection };
}

// Apaga a letra da célula atual; se já estiver vazia, volta uma célula e apaga a anterior
export function backspace(layout: Layout, grid: Grid, input: string[][], sel: Selection): Edit {
  const next = input.map((r) => [...r]);
  if (next[sel.row][sel.col] !== '') {
    next[sel.row][sel.col] = '';
    return { input: next, selection: sel };
  }
  const p = positionInWord(layout, grid, sel);
  if (!p || p.pos <= 0) return { input: next, selection: sel };

  const prev = p.cells[p.pos - 1];
  next[prev.row][prev.col] = '';
  return { input: next, selection: { row: prev.row, col: prev.col, dir: sel.dir } };
}

const DELTAS = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
} as const;

export type ArrowKey = keyof typeof DELTAS;

// Setas: vão para a próxima célula com letra naquela direção (pulando espaços vazios)
export function arrow(grid: Grid, sel: Selection, key: ArrowKey): Selection {
  const [dr, dc] = DELTAS[key];
  const cols = grid[0]?.length ?? 0;
  let r = sel.row + dr;
  let c = sel.col + dc;

  while (r >= 0 && r < grid.length && c >= 0 && c < cols) {
    const cell = grid[r][c];
    if (cell) {
      const wanted: Dir = dr === 0 ? 'across' : 'down';
      const hasWanted = wanted === 'across' ? cell.across !== null : cell.down !== null;
      const hasCurrent = sel.dir === 'across' ? cell.across !== null : cell.down !== null;
      const dir: Dir = hasWanted ? wanted : hasCurrent ? sel.dir : cell.across !== null ? 'across' : 'down';
      return { row: r, col: c, dir };
    }
    r += dr;
    c += dc;
  }
  return sel;
}

// Tab / Shift+Tab: próxima ou anterior palavra da lista de dicas (com volta ao início)
export function stepWord(layout: Layout, grid: Grid, sel: Selection, step: 1 | -1): Selection {
  const n = layout.words.length;
  const idx = activeWordIndex(grid, sel) ?? 0;
  return selectWord(layout, (idx + step + n) % n);
}
