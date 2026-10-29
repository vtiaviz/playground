import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Editor from './Editor';
import Game from './Game';
import { validateConfig } from '../config';
import { wordSearchScore } from '../lib/scoring';

const config = { title: 'Teste', words: ['sol', 'lua', 'mar'], seed: 7, directions: 'all' as const };

describe('caça-palavras como módulo', () => {
  afterEach(cleanup);

  it('pontuação: palavras x 100 + bônus de tempo', () => {
    const fast = wordSearchScore(3, 1);
    expect(fast.max).toBe(3 * 150);
    expect(fast.score).toBeLessThanOrEqual(fast.max);
    const slow = wordSearchScore(3, 10_000);
    expect(slow.score).toBe(300);
    expect(slow.timeBonus).toBe(0);
    expect(fast.score).toBeGreaterThan(slow.score);
  });

  it('a tela inicial mostra as regras e o botão Começar', () => {
    render(<Game config={config} />);
    expect(screen.getByRole('button', { name: /começar/i })).toBeTruthy();
    expect(screen.getByText(/3 palavras escondidas/)).toBeTruthy();
  });

  it('o Editor salva uma config válida', () => {
    const onSave = vi.fn();
    render(<Editor onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar jogo' }));
    expect(validateConfig(onSave.mock.calls[0][0])).not.toBeNull();
  });

  it('reabre o jogo salvo mantendo semente, tamanho e direções', () => {
    const onSave = vi.fn();
    render(<Editor initialConfig={{ ...config, size: 10, directions: 'simple' }} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar jogo' }));
    const saved = onSave.mock.calls[0][0];
    expect(saved).toMatchObject({ words: config.words, seed: 7, size: 10, directions: 'simple' });
  });

  it('sem palavras válidas o Salvar fica desabilitado', () => {
    render(<Editor onSave={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox', { name: /palavras/i }), { target: { value: 'a' } });
    expect((screen.getByRole('button', { name: 'Salvar jogo' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
