import { useEffect, useMemo, useRef, type CSSProperties, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { buildGrid, normalizeLetter, wordCells, type Layout } from '../lib/crossword';
import {
  activeWordIndex, arrow, backspace, selectCell, stepWord, typeLetter,
  type ArrowKey, type Edit, type Selection,
} from '../lib/navigation';

// Caractere invisível que mantemos dentro do campo oculto: quando o teclado virtual apaga
// esse caractere, sabemos que foi um Backspace (mesmo sem evento keydown confiável).
const SENTINEL = '\u200b';

interface Props {
  layout: Layout;
  input: string[][];                // letras digitadas ('' = vazia), linhas × colunas
  selection: Selection;
  wrong?: ReadonlySet<string>;      // células marcadas como erradas ("linha,coluna")
  disabled?: boolean;
  onChange: (input: string[][], selection: Selection) => void;
}

export default function Grid({ layout, input, selection, wrong, disabled, onChange }: Props) {
  const grid = useMemo(() => buildGrid(layout), [layout]);
  const inputRef = useRef<HTMLInputElement>(null);

  const idx = activeWordIndex(grid, selection);
  const word = idx !== null ? layout.words[idx] : null;
  const wordSet = useMemo(
    () => new Set(word ? wordCells(word).map((c) => `${c.row},${c.col}`) : []),
    [word],
  );
  const label = word
    ? `${word.number} ${word.dir === 'across' ? 'horizontal' : 'vertical'}, ${word.answer.length} letras: ${word.clue}`
    : 'Palavras cruzadas';

  // Leva o foco para o campo oculto quando a seleção muda (clique numa dica, por exemplo),
  // mas nunca na primeira renderização (não roubar o foco da página nem abrir o teclado sozinho).
  const selKey = `${selection.row},${selection.col},${selection.dir}`;
  const lastKey = useRef(selKey);
  useEffect(() => {
    if (lastKey.current !== selKey && !disabled) inputRef.current?.focus({ preventScroll: true });
    lastKey.current = selKey;
  }, [selKey, disabled]);

  const apply = (edit: Edit) => onChange(edit.input, edit.selection);

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-r]');
    if (!el) return;
    const sel = selectCell(grid, selection, Number(el.dataset.r), Number(el.dataset.c));
    if (sel) onChange(input, sel);
    inputRef.current?.focus({ preventScroll: true });
  };

  // Letras (teclado físico e virtual) chegam por aqui
  const onInput = (e: FormEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const value = el.value;
    el.value = SENTINEL;
    if (disabled) return;

    if (value === '') {
      apply(backspace(layout, grid, input, selection));
      return;
    }
    const letters = [...value.replaceAll(SENTINEL, '')]
      .map(normalizeLetter)
      .filter((l): l is string => l !== null);
    if (letters.length === 0) return;

    let cur: Edit = { input, selection };
    for (const l of letters) cur = typeLetter(layout, grid, cur.input, cur.selection, l);
    apply(cur);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled || e.ctrlKey || e.metaKey || e.altKey) return;

    switch (e.key) {
      case 'Backspace':
        e.preventDefault();
        apply(backspace(layout, grid, input, selection));
        break;
      case 'Delete': {
        e.preventDefault();
        const next = input.map((r) => [...r]);
        next[selection.row][selection.col] = '';
        onChange(next, selection);
        break;
      }
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        e.preventDefault();
        onChange(input, arrow(grid, selection, e.key as ArrowKey));
        break;
      case ' ': {
        e.preventDefault(); // espaço alterna entre horizontal e vertical
        const s = selectCell(grid, selection, selection.row, selection.col);
        if (s) onChange(input, s);
        break;
      }
      case 'Tab': {
        // Tab percorre as palavras; na primeira/última deixa o foco sair da grade (acessibilidade)
        const last = idx === layout.words.length - 1;
        const first = idx === 0;
        if ((!e.shiftKey && last) || (e.shiftKey && first)) return;
        e.preventDefault();
        onChange(input, stepWord(layout, grid, selection, e.shiftKey ? -1 : 1));
        break;
      }
    }
  };

  return (
    <div className="cw-wrap">
      <div
        className="cw-grid"
        style={{ '--cols': layout.cols, '--rows': layout.rows } as CSSProperties}
      >
        <div className="cw-cells" aria-hidden="true" onClick={onClick}>
          {grid.map((line, r) =>
            line.map((cell, c) => {
              if (!cell) return <div key={`${r}-${c}`} className="cw-empty" />;
              const k = `${r},${c}`;
              const cls = [
                'cw-cell',
                !grid[r - 1]?.[c] && 'edge-top',
                !grid[r]?.[c - 1] && 'edge-left',
                wordSet.has(k) && 'is-word',
                r === selection.row && c === selection.col && 'is-current',
                wrong?.has(k) && 'is-wrong',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <div key={`${r}-${c}`} className={cls} data-r={r} data-c={c}>
                  {cell.number !== null && <span className="cw-num">{cell.number}</span>}
                  <span className="cw-letter">{input[r]?.[c] ?? ''}</span>
                </div>
              );
            }),
          )}
        </div>

        {/* Campo oculto: recebe o teclado (inclusive o do celular) e fica sobre a célula atual */}
        <input
          ref={inputRef}
          className="cw-input"
          style={{ '--r': selection.row, '--c': selection.col } as CSSProperties}
          defaultValue={SENTINEL}
          disabled={disabled}
          aria-label={label}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          onInput={onInput}
          onKeyDown={onKeyDown}
        />
      </div>
    </div>
  );
}
