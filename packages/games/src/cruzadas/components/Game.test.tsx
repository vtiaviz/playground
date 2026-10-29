import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Game from './Game';
import { validateLayout } from '../lib/crossword';

const SENTINEL = '\u200b';

// CASA (horizontal), COLA e SOL (verticais): 9 células -> referência 27 s, mínimo em 108 s
const layout = validateLayout([
  { answer: 'CASA', clue: 'Moradia', row: 0, col: 0, dir: 'across' },
  { answer: 'COLA', clue: 'Adesivo', row: 0, col: 0, dir: 'down' },
  { answer: 'SOL', clue: 'Astro rei', row: 0, col: 2, dir: 'down' },
])!;
const config = { title: 'Teste', layout };

const hidden = () => document.querySelector('input') as HTMLInputElement;
const type = (letters: string) =>
  [...letters].forEach((l) => fireEvent.input(hidden(), { target: { value: SENTINEL + l } }));
const clickClue = (text: string) =>
  fireEvent.click(Array.from(document.querySelectorAll('.cw-clues button')).find((b) => b.textContent?.includes(text))!);
const start = () => fireEvent.click(screen.getByRole('button', { name: /começar/i }));

// preenche tudo certo: CASA, depois COLA (vertical) e SOL (vertical)
const solve = () => {
  type('CASA');
  clickClue('Adesivo');
  type('COLA');
  clickClue('Astro rei');
  type('SOL');
};

describe('Game', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'],
    });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });

  it('a tela inicial não mostra a grade nem as dicas e informa o tempo de referência', () => {
    render(<Game config={config} />);
    expect(screen.getByText('3 palavras · 9 letras')).toBeTruthy();
    expect(screen.getByText(/até 0:27/)).toBeTruthy();
    expect(document.querySelector('.cw-grid')).toBeNull();
    expect(screen.queryByText('Adesivo')).toBeNull();

    start();
    expect(document.querySelector('.cw-grid')).not.toBeNull();
    expect(screen.getAllByText(/Adesivo/).length).toBeGreaterThan(0);
    expect(screen.getByText('⏱ 0:00')).toBeTruthy();
  });

  it('termina sozinho ao acertar tudo e dá a pontuação máxima dentro do tempo de referência', () => {
    render(<Game config={config} />);
    start();
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    solve();

    expect(screen.getByText('1000')).toBeTruthy();
    expect(screen.getByText('Tempo: 0:20')).toBeTruthy();
    expect(screen.getByRole('img', { name: '3 de 3 estrelas' })).toBeTruthy();
    expect(document.querySelector('.cw-grid')).not.toBeNull(); // grade resolvida
  });

  it('a pontuação cai com o tempo: 67,5 s com referência de 27 s dá 550', () => {
    render(<Game config={config} />);
    start();
    act(() => {
      vi.advanceTimersByTime(67_500);
    });
    solve();
    expect(screen.getByText('550')).toBeTruthy();
    expect(screen.getByText('Tempo: 1:07')).toBeTruthy();
    expect(screen.getByRole('img', { name: '2 de 3 estrelas' })).toBeTruthy();
  });

  it('não conta o tempo com a aba em segundo plano', () => {
    render(<Game config={config} />);
    start();
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    const setHidden = (hidden: boolean) => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
      document.dispatchEvent(new Event('visibilitychange'));
    };
    setHidden(true);
    act(() => {
      vi.advanceTimersByTime(60_000); // escondida: não conta (senão daria ~411 pontos)
    });
    setHidden(false);
    solve();
    expect(screen.getByText('1000')).toBeTruthy();
  });

  it('Verificar marca as letras erradas, avisa e limpa as marcas ao editar', () => {
    render(<Game config={config} />);
    start();
    type('Z'); // errada, em (0,0)

    fireEvent.click(screen.getByRole('button', { name: /verificar/i }));
    expect(screen.getByText('1 letra errada marcada.')).toBeTruthy();
    expect(document.querySelector('[data-r="0"][data-c="0"]')!.classList.contains('is-wrong')).toBe(true);

    // só mudar a seleção mantém a marca
    fireEvent.click(document.querySelector('[data-r="0"][data-c="1"]')!);
    expect(document.querySelector('[data-r="0"][data-c="0"]')!.classList.contains('is-wrong')).toBe(true);

    // editar limpa
    type('A');
    expect(document.querySelector('.is-wrong')).toBeNull();
    expect(screen.queryByText('1 letra errada marcada.')).toBeNull();
  });

  it('Verificar sem letras erradas informa quantas faltam e conta as verificações no final', () => {
    render(<Game config={config} />);
    start();
    fireEvent.click(screen.getByRole('button', { name: /verificar/i }));
    expect(screen.getByText('Nenhuma letra errada. Faltam 9 células.')).toBeTruthy();

    solve();
    expect(screen.getByText('Verificações usadas: 1')).toBeTruthy();
  });

  it('mostra a dica atual acima da grade e o progresso de letras', () => {
    render(<Game config={config} />);
    start();
    expect(document.querySelector('.cw-current')!.textContent).toBe('1 Horizontal · Moradia');
    expect(screen.getByText('0/9 letras')).toBeTruthy();
    type('CA');
    expect(screen.getByText('2/9 letras')).toBeTruthy();
  });

  it('Jogar de novo limpa tudo e recomeça o cronômetro', () => {
    render(<Game config={config} />);
    start();
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    solve();
    fireEvent.click(screen.getByRole('button', { name: /jogar de novo/i }));

    expect(screen.getByText('0/9 letras')).toBeTruthy();
    expect(screen.getByText('⏱ 0:00')).toBeTruthy();
    expect(screen.queryByText('Verificações usadas: 1')).toBeNull();
  });
});
