import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { matchSelection, type Placement, type Puzzle } from '../lib/generator';

// Cores dos destaques, na ordem em que as palavras são encontradas
export const HIGHLIGHT_COLORS = ['#7CFC00', '#FFD43B', '#FF6B6B', '#4DABF7', '#B197FC', '#FFA94D'];

interface Props {
  puzzle: Puzzle;
  found: Placement[];               // a posição na lista define a cor do destaque
  onFound: (p: Placement) => void;
  onMiss?: () => void; // arrastou sobre 2+ letras que não formam uma palavra (ou já achada)
}

interface Selection {
  r1: number; c1: number; // início (fixo)
  r2: number; c2: number; // fim (já "preso" a uma das 8 direções)
}

// Segmento arredondado que liga o centro da célula inicial ao da final
function Pill({ r1, c1, r2, c2, color }: Selection & { color: string }) {
  return (
    <line
      x1={c1 + 0.5} y1={r1 + 0.5}
      x2={c2 + 0.5} y2={r2 + 0.5}
      stroke={color}
      strokeWidth={0.78}
      strokeLinecap="round"
      opacity={0.45}
    />
  );
}

export default function Board({ puzzle, found, onFound, onMiss }: Props) {
  const { size, grid } = puzzle;
  const boardRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<Selection | null>(null);

  // Converte a posição do ponteiro em (linha, coluna), limitada à grade
  const cellAt = (e: PointerEvent) => {
    const rect = boardRef.current!.getBoundingClientRect();
    const clamp = (v: number) => Math.min(size - 1, Math.max(0, v));
    return {
      r: clamp(Math.floor(((e.clientY - rect.top) / rect.height) * size)),
      c: clamp(Math.floor(((e.clientX - rect.left) / rect.width) * size)),
    };
  };

  // Prende a seleção à direção (entre as 8) mais próxima do ponteiro
  const snap = (r1: number, c1: number, r: number, c: number): Selection => {
    const dr = r - r1;
    const dc = c - c1;
    if (dr === 0 && dc === 0) return { r1, c1, r2: r1, c2: c1 };

    const step = Math.round(Math.atan2(dr, dc) / (Math.PI / 4));
    const a = step * (Math.PI / 4);
    const vr = Math.round(Math.sin(a));
    const vc = Math.round(Math.cos(a));

    let len = Math.max(Math.abs(dr), Math.abs(dc));
    const out = (n: number) => {
      const rr = r1 + vr * n;
      const cc = c1 + vc * n;
      return rr < 0 || rr >= size || cc < 0 || cc >= size;
    };
    while (len > 0 && out(len)) len--;

    return { r1, c1, r2: r1 + vr * len, c2: c1 + vc * len };
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const { r, c } = cellAt(e);
    setSel({ r1: r, c1: c, r2: r, c2: c });
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!sel) return;
    const { r, c } = cellAt(e);
    setSel((s) => (s ? snap(s.r1, s.c1, r, c) : s));
  };

  const onPointerUp = () => {
    if (!sel) return;
    const m = matchSelection(puzzle, sel.r1, sel.c1, sel.r2, sel.c2);
    const alreadyFound =
      m && found.some((f) => f.row === m.row && f.col === m.col && f.base === m.base);
    if (m && !alreadyFound) onFound(m);
    else if (sel.r1 !== sel.r2 || sel.c1 !== sel.c2) onMiss?.();
    setSel(null);
  };

  return (
    <div className="board-wrap">
      <div
        ref={boardRef}
        className="board"
        style={{ '--n': size } as CSSProperties}
        role="img"
        aria-label="Grade do caça-palavras"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setSel(null)}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => (
            <div key={`${r}-${c}`} className="cell">
              {cell.shown}
            </div>
          )),
        )}

        <svg className="overlay" viewBox={`0 0 ${size} ${size}`}>
          {found.map((p, i) => (
            <Pill
              key={`${p.row}-${p.col}-${p.base}`}
              r1={p.row}
              c1={p.col}
              r2={p.row + p.dr * (p.base.length - 1)}
              c2={p.col + p.dc * (p.base.length - 1)}
              color={HIGHLIGHT_COLORS[i % HIGHLIGHT_COLORS.length]}
            />
          ))}
          {sel && (
            <Pill {...sel} color={HIGHLIGHT_COLORS[found.length % HIGHLIGHT_COLORS.length]} />
          )}
        </svg>
      </div>
    </div>
  );
}
