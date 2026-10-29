import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Editor from './Editor';
import Game from './Game';
import { validateConfig } from '../config';
import { validateLayout } from '../lib/crossword';

const SENTINEL = '​';
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
const solve = () => {
  type('CASA');
  clickClue('Adesivo');
  type('COLA');
  clickClue('Astro rei');
  type('SOL');
};

describe('cruzadas como módulo', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('onFocusChange: a palavra selecionada e as letras digitadas nela', () => {
    const onFocusChange = vi.fn();
    render(<Game config={config} onFocusChange={onFocusChange} />);
    fireEvent.click(screen.getByRole('button', { name: /começar/i }));
    const idx = (answer: string) => layout.words.findIndex((w) => w.answer === answer);
    expect(onFocusChange).toHaveBeenLastCalledWith({ item: idx('CASA'), state: 'Letras já digitadas nesta palavra: _ _ _ _' });
    type('CA');
    expect(onFocusChange).toHaveBeenLastCalledWith({ item: idx('CASA'), state: 'Letras já digitadas nesta palavra: C A _ _' });
    clickClue('Astro rei');
    expect(onFocusChange).toHaveBeenLastCalledWith({ item: idx('SOL'), state: 'Letras já digitadas nesta palavra: _ _ _' });
  });

  it('onComplete é chamado uma vez, com a pontuação', () => {
    const onComplete = vi.fn();
    render(<Game config={config} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /começar/i }));
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    solve();
    expect(onComplete).toHaveBeenCalledTimes(1);
    const r = onComplete.mock.calls[0][0];
    expect(r.score).toBe(1000);
    expect(r.maxScore).toBe(1000);
    expect(r.durationSeconds).toBeGreaterThanOrEqual(19);
    expect(r.durationSeconds).toBeLessThanOrEqual(21);
    expect(r.details.items).toHaveLength(config.layout.words.length);
    expect(r.details.items.every((i: { correct: number; errors: number }) => i.correct === 1 && i.errors === 0)).toBe(true);
  });

  it('allowRestart={false} esconde "Jogar de novo"', () => {
    render(<Game config={config} allowRestart={false} />);
    fireEvent.click(screen.getByRole('button', { name: /começar/i }));
    solve();
    expect(screen.queryByRole('button', { name: /jogar de novo/i })).toBeNull();
  });

  it('o Editor salva uma config válida', () => {
    const onSave = vi.fn();
    render(<Editor onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar jogo' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(validateConfig(onSave.mock.calls[0][0])).not.toBeNull();
  });

  it('reabrir um jogo salvo mantém a grade, e saveLabel/onCancel funcionam', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<Editor initialConfig={config} onSave={onSave} onCancel={onCancel} saveLabel="Guardar" />);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(onSave.mock.calls[0][0].layout).toEqual(config.layout);
    expect(onSave.mock.calls[0][0].title).toBe('Teste');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('texto inválido desabilita o Salvar', () => {
    render(<Editor onSave={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox', { name: /respostas e dicas/i }), { target: { value: 'a' } });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect((screen.getByRole('button', { name: 'Salvar jogo' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
