import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Editor from './Editor';
import Game from './Game';
import { validateConfig } from '../config';

const config = { title: 'Teste', theme: 'Natureza', words: ['sol', 'lua', 'mar', 'rio', 'céu'] };
const press = (keys: string) => [...keys].forEach((k) => fireEvent.keyDown(window, { key: k }));
const click = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));

describe('forca como módulo', () => {
  afterEach(cleanup);

  const playAll = () => {
    click(/começar/i);
    press('sol');
    click(/próxima palavra/i);
    press('lua');
    click(/próxima palavra/i);
    press('mar');
    click(/próxima palavra/i);
    press('rio');
    click(/próxima palavra/i);
    press('ceu');
    click(/ver resultado/i);
  };

  it('onComplete é chamado uma vez ao terminar as 5 palavras', () => {
    const onComplete = vi.fn();
    render(<Game config={config} onComplete={onComplete} />);
    playAll();
    expect(onComplete).toHaveBeenCalledTimes(1);
    const r = onComplete.mock.calls[0][0];
    expect(r.maxScore).toBe(750);
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThanOrEqual(750);
    expect(r.details.items).toHaveLength(5);
    expect(r.details.items[0]).toMatchObject({ correct: expect.any(Number), errors: expect.any(Number) });
  });

  it('onFocusChange: palavra em jogo e letras já tentadas, sem a palavra', () => {
    const onFocusChange = vi.fn();
    render(<Game config={config} onFocusChange={onFocusChange} />);
    click(/começar/i);
    press('sx');
    expect(onFocusChange).toHaveBeenLastCalledWith({
      item: 0,
      state: 'Palavra na tela: S _ _. Letras erradas: X. Erros restantes: 5',
    });
    press('ol');
    expect(onFocusChange).toHaveBeenLastCalledWith(null); // resultado da palavra
    click(/próxima palavra/i);
    expect(onFocusChange).toHaveBeenLastCalledWith(expect.objectContaining({ item: 1 }));
  });

  it('allowRestart={false} esconde "Jogar de novo"', () => {
    render(<Game config={config} allowRestart={false} />);
    playAll();
    expect(screen.queryByRole('button', { name: /jogar de novo/i })).toBeNull();
  });

  it('o Editor salva uma config válida', () => {
    const onSave = vi.fn();
    render(<Editor onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar jogo' }));
    expect(validateConfig(onSave.mock.calls[0][0])).not.toBeNull();
  });

  it('reabre o jogo salvo e devolve a mesma config', () => {
    const onSave = vi.fn();
    render(<Editor initialConfig={config} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar jogo' }));
    expect(onSave).toHaveBeenCalledWith(config);
  });

  it('palavra inválida desabilita o Salvar', () => {
    render(<Editor initialConfig={config} onSave={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Palavra 1'), { target: { value: 'ab' } });
    expect((screen.getByRole('button', { name: 'Salvar jogo' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
