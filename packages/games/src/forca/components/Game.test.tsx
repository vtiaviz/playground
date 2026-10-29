import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Game from './Game';

const config = { title: 'Teste', theme: 'Natureza', words: ['sol', 'lua', 'mar', 'rio', 'céu'] };

const press = (keys: string) => [...keys].forEach((k) => fireEvent.keyDown(window, { key: k }));
const click = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));

describe('Game', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'],
    });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('joga as 5 palavras em sequência e calcula a pontuação final', () => {
    render(<Game config={config} />);
    expect(screen.getByText('Teste')).toBeTruthy();
    expect(screen.getByText('Natureza')).toBeTruthy();

    click(/começar/i);
    expect(screen.getByText('Palavra 1/5')).toBeTruthy();

    // 1) SOL: 0 erros em 10 s -> 100 + round(50 * (1 - 10/60)) = 142
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    press('sol');
    expect(screen.getByText('Acertou! +142 pontos')).toBeTruthy();

    // 2) LUA: 3 erros em 0 s -> (100 - 45) + 50 = 105
    click(/próxima palavra/i);
    expect(screen.getByText('Palavra 2/5')).toBeTruthy();
    press('xzq');
    press('lua');
    expect(screen.getByText('Acertou! +105 pontos')).toBeTruthy();

    // 3) MAR: 6 erros -> perde, 0 pontos
    click(/próxima palavra/i);
    press('bcdfgh');
    expect(screen.getByText('Não foi dessa vez.')).toBeTruthy();

    // 4) RIO e 5) CÉU (digitar "e" acerta "É"): 150 cada
    click(/próxima palavra/i);
    press('rio');
    expect(screen.getByText('Acertou! +150 pontos')).toBeTruthy();
    click(/próxima palavra/i);
    press('ceu');
    expect(screen.getByText('Acertou! +150 pontos')).toBeTruthy();

    // final: 142 + 105 + 0 + 150 + 150 = 547 de 750 (73%) -> 2 estrelas
    click(/ver resultado/i);
    expect(screen.getByText('547')).toBeTruthy();
    expect(screen.getByRole('img', { name: '2 de 3 estrelas' })).toBeTruthy();

    // jogar de novo volta à primeira palavra
    click(/jogar de novo/i);
    expect(screen.getByText('Palavra 1/5')).toBeTruthy();
  });

  it('ignora o teclado físico quando o foco está num campo de texto', () => {
    render(
      <>
        <input aria-label="campo" />
        <Game config={config} />
      </>,
    );
    click(/começar/i);
    expect(screen.getByText('6 erros restantes')).toBeTruthy();

    fireEvent.keyDown(screen.getByLabelText('campo'), { key: 'x' });
    expect(screen.getByText('6 erros restantes')).toBeTruthy();

    fireEvent.keyDown(window, { key: 'x' });
    expect(screen.getByText('5 erros restantes')).toBeTruthy();
  });

  it('o cronômetro não conta o tempo com a aba em segundo plano', () => {
    render(<Game config={config} />);
    click(/começar/i);

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    const setHidden = (hidden: boolean) => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
      document.dispatchEvent(new Event('visibilitychange'));
    };
    setHidden(true);
    act(() => {
      vi.advanceTimersByTime(30_000); // aba escondida: não conta
    });
    setHidden(false);
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    press('sol');

    // 10 s ativos -> 100 + 42 = 142 (e não 40 s)
    expect(screen.getByText('Acertou! +142 pontos')).toBeTruthy();
  });
});
