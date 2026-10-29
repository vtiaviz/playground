import { cleanup, fireEvent, render } from '@testing-library/react';
import { useMemo, useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import ClueList from './ClueList';
import Grid from './Grid';
import { buildGrid, validateLayout } from '../lib/crossword';
import { activeWordIndex, emptyInput, initialSelection, selectWord } from '../lib/navigation';

afterEach(cleanup);

const SENTINEL = '\u200b';

// CASA (horizontal), COLA e SOL (verticais)
const layout = validateLayout([
  { answer: 'CASA', clue: 'Moradia', row: 0, col: 0, dir: 'across' },
  { answer: 'COLA', clue: 'Adesivo', row: 0, col: 0, dir: 'down' },
  { answer: 'SOL', clue: 'Astro rei', row: 0, col: 2, dir: 'down' },
])!;

function Harness({ wrong, disabled }: { wrong?: ReadonlySet<string>; disabled?: boolean }) {
  const grid = useMemo(() => buildGrid(layout), []);
  const [input, setInput] = useState(() => emptyInput(layout));
  const [selection, setSelection] = useState(() => initialSelection(layout));
  return (
    <>
      <Grid
        layout={layout}
        input={input}
        selection={selection}
        wrong={wrong}
        disabled={disabled}
        onChange={(i, s) => {
          setInput(i);
          setSelection(s);
        }}
      />
      <ClueList
        layout={layout}
        activeIndex={activeWordIndex(grid, selection)}
        onSelect={(i) => setSelection(selectWord(layout, i))}
      />
    </>
  );
}

const setup = (props: Parameters<typeof Harness>[0] = {}) => {
  const { container } = render(<Harness {...props} />);
  const cell = (r: number, c: number) => container.querySelector(`[data-r="${r}"][data-c="${c}"]`) as HTMLElement;
  const hidden = () => container.querySelector('input') as HTMLInputElement;
  const letter = (r: number, c: number) => cell(r, c).querySelector('.cw-letter')!.textContent;
  const type = (l: string) => fireEvent.input(hidden(), { target: { value: SENTINEL + l } });
  const key = (k: string, init: object = {}) => fireEvent.keyDown(hidden(), { key: k, ...init });
  return { container, cell, hidden, letter, type, key };
};

describe('Grid', () => {
  it('destaca a palavra e a célula atuais e descreve a dica para leitores de tela', () => {
    const { cell, hidden } = setup();
    for (let c = 0; c < 4; c++) expect(cell(0, c).classList.contains('is-word')).toBe(true);
    expect(cell(1, 0).classList.contains('is-word')).toBe(false);
    expect(cell(0, 0).classList.contains('is-current')).toBe(true);
    expect(hidden().getAttribute('aria-label')).toBe('1 horizontal, 4 letras: Moradia');
  });

  it('mostra os números nos cantos das células que iniciam palavras', () => {
    const { cell } = setup();
    expect(cell(0, 0).querySelector('.cw-num')!.textContent).toBe('1');
    expect(cell(0, 2).querySelector('.cw-num')!.textContent).toBe('2');
    expect(cell(0, 1).querySelector('.cw-num')).toBeNull();
  });

  it('clicar na célula atual alterna entre horizontal e vertical', () => {
    const { cell, hidden } = setup();
    fireEvent.click(cell(0, 0));
    expect(cell(1, 0).classList.contains('is-word')).toBe(true);
    expect(hidden().getAttribute('aria-label')).toBe('1 vertical, 4 letras: Adesivo');
    fireEvent.click(cell(0, 0));
    expect(hidden().getAttribute('aria-label')).toBe('1 horizontal, 4 letras: Moradia');
  });

  it('clicar numa célula leva o foco ao campo que recebe o teclado', () => {
    const { cell, hidden } = setup();
    expect(document.activeElement).not.toBe(hidden());
    fireEvent.click(cell(0, 1));
    expect(document.activeElement).toBe(hidden());
  });

  it('digitar preenche e avança; acento vale como a letra base', () => {
    const { letter, type } = setup();
    type('c');
    type('á');
    type('s');
    type('a');
    expect([0, 1, 2, 3].map((c) => letter(0, c))).toEqual(['C', 'A', 'S', 'A']);
  });

  it('ignora teclas que não são letras', () => {
    const { letter, type } = setup();
    type('1');
    type(' ');
    expect(letter(0, 0)).toBe('');
  });

  it('Backspace apaga e volta uma célula (teclado físico e virtual)', () => {
    const { letter, key, hidden, type } = setup();
    type('c');
    type('a'); // seleção agora em (0,2)
    key('Backspace'); // (0,2) vazia -> volta e apaga (0,1)
    expect([letter(0, 0), letter(0, 1)]).toEqual(['C', '']);
    // teclado virtual: o sentinela some do campo
    fireEvent.input(hidden(), { target: { value: '' } });
    expect(letter(0, 0)).toBe('');
  });

  it('setas, espaço e Tab navegam', () => {
    const { cell, key, hidden } = setup();
    key('ArrowDown');
    expect(cell(1, 0).classList.contains('is-current')).toBe(true);
    expect(hidden().getAttribute('aria-label')).toContain('1 vertical');

    key('Tab'); // próxima palavra: SOL
    expect(cell(0, 2).classList.contains('is-current')).toBe(true);
    expect(hidden().getAttribute('aria-label')).toContain('2 vertical');

    key('Tab', { shiftKey: true });
    expect(hidden().getAttribute('aria-label')).toContain('1 vertical');

    expect(cell(0, 0).classList.contains('is-current')).toBe(true); // Tab leva ao início da palavra

    key('ArrowDown');
    key('ArrowRight'); // de (1,0) pula o espaço vazio e vai para (1,2)
    expect(cell(1, 2).classList.contains('is-current')).toBe(true);
  });

  it('clicar numa dica seleciona a palavra e destaca a dica', () => {
    const { cell, container } = setup();
    const clue = Array.from(container.querySelectorAll('.cw-clues button')).find((b) => b.textContent?.includes('Astro rei'))!;
    fireEvent.click(clue);
    expect(cell(2, 2).classList.contains('is-word')).toBe(true);
    expect(clue.classList.contains('is-active')).toBe(true);
    expect(clue.getAttribute('aria-current')).toBe('true');
  });

  it('marca letras erradas', () => {
    const { cell } = setup({ wrong: new Set(['0,1']) });
    expect(cell(0, 1).classList.contains('is-wrong')).toBe(true);
    expect(cell(0, 0).classList.contains('is-wrong')).toBe(false);
  });

  it('não aceita digitação quando desativado', () => {
    const { letter, type } = setup({ disabled: true });
    type('c');
    expect(letter(0, 0)).toBe('');
  });
});

describe('ClueList', () => {
  it('lista horizontais e verticais com número e dica', () => {
    const { container } = setup();
    const headings = Array.from(container.querySelectorAll('.cw-clues h2')).map((h) => h.textContent);
    expect(headings).toEqual(['Horizontais', 'Verticais']);
    const items = Array.from(container.querySelectorAll('.cw-clues li')).map((li) => li.textContent);
    expect(items).toEqual(['1. Moradia', '1. Adesivo', '2. Astro rei']);
  });
});
