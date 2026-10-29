import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Game from './Game';
import { parseQuiz } from '../lib/quiz';

// Os dois exemplos do usuário: referência de 28 s (10,5 + 17,5), bônus zerado em 112 s
const { questions } = parseQuiz(`1 - Qual a principal função do HD?
a) Armazenar informações
b) Criar novas paginas web
c) Ocupar espaço vazio no gabinete
d) É uma peça em desuso
respota: a

2 - Qual é a principal função do método \`Array.prototype.map()\` em JavaScript?
A) Filtrar elementos de um array com base em uma condição
B) Criar um novo array com os resultados da chamada de uma função para cada elemento
C) Adicionar um novo elemento ao final do array
D) Remover o primeiro elemento de um array
resposta: B`);
const config = { title: 'Teste', questions };

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const start = () => fireEvent.click(screen.getByRole('button', { name: /começar/i }));
const option = (i: number) => document.querySelectorAll<HTMLButtonElement>('.qz-option')[i];
const choose = (i: number) => fireEvent.click(option(i));
const next = (label = /próxima questão|ver resultado/i) => fireEvent.click(screen.getByRole('button', { name: label }));

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

  it('a tela inicial não mostra as perguntas e informa o tempo de referência', () => {
    render(<Game config={config} />);
    expect(screen.getByText('2 questões de múltipla escolha')).toBeTruthy();
    expect(screen.getByText(/até 0:28/)).toBeTruthy();
    expect(screen.queryByText(/principal função do HD/)).toBeNull();
    expect(document.querySelector('.qz-option')).toBeNull();

    start();
    expect(screen.getByText(/principal função do HD/)).toBeTruthy();
    expect(screen.getByText('Questão 1/2')).toBeTruthy();
    expect(screen.getByText('⏱ 0:00')).toBeTruthy();
  });

  it('tudo certo e rápido: pontuação máxima e 3 estrelas', () => {
    render(<Game config={config} />);
    start();
    advance(10_000);
    choose(0); // certa
    next();
    advance(10_000);
    choose(1); // certa
    next(/ver resultado/i);

    expect(screen.getByText('300')).toBeTruthy(); // 200 de acertos + 100 de bônus
    expect(screen.getByText('2 de 2 questões certas · Tempo: 0:20')).toBeTruthy();
    expect(screen.getByRole('img', { name: '3 de 3 estrelas' })).toBeTruthy();
  });

  it('o tempo de ler o feedback não conta', () => {
    render(<Game config={config} />);
    start();
    advance(10_000);
    choose(0);
    advance(60_000); // lendo o feedback: pausado
    next();
    advance(5_000);
    choose(1);
    next(/ver resultado/i);

    expect(screen.getByText(/Tempo: 0:15/)).toBeTruthy(); // 10 s + 5 s
    expect(screen.getByText('300')).toBeTruthy();
  });

  it('o cronômetro para na última resposta, não ao clicar em Ver resultado', () => {
    render(<Game config={config} />);
    start();
    choose(0);
    next();
    advance(20_000);
    choose(1);
    advance(300_000); // demorou para clicar em "Ver resultado"
    next(/ver resultado/i);
    expect(screen.getByText(/Tempo: 0:20/)).toBeTruthy();
  });

  it('quem erra não ganha bônus de tempo: 1 certa em 70 s dá 125 e 1 estrela', () => {
    render(<Game config={config} />);
    start();
    advance(30_000);
    choose(2); // errada (certa é A)
    expect(screen.getByText('Errou. A resposta certa é A.')).toBeTruthy();
    next();
    advance(40_000);
    choose(1); // certa
    next(/ver resultado/i);

    // 100 de acerto + round(1 × 50 × 0,5) = 125 de 300
    expect(screen.getByText('125')).toBeTruthy();
    expect(screen.getByRole('img', { name: '1 de 3 estrelas' })).toBeTruthy();
    expect(screen.getByText('Acertos: +100 · Tempo: +25 (bônus máximo até 0:28)')).toBeTruthy();
  });

  it('a revisão mostra a sua resposta e o gabarito das erradas', () => {
    render(<Game config={config} />);
    start();
    choose(1); // errada: B em vez de A
    next();
    choose(1); // certa
    next(/ver resultado/i);

    const items = Array.from(document.querySelectorAll('.qz-review li'));
    expect(items.map((li) => li.className)).toEqual(['is-wrong', 'is-correct']);
    expect(items[0].textContent).toContain('Sua resposta: B) Criar novas paginas web');
    expect(items[0].textContent).toContain('Gabarito: A) Armazenar informações');
    expect(items[1].textContent).toContain('B) Criar um novo array');
    expect(items[1].textContent).not.toContain('Gabarito');
  });

  it('atalhos de teclado respondem e o botão seguinte recebe o foco', () => {
    render(<Game config={config} />);
    start();
    fireEvent.keyDown(window, { key: 'a' });
    expect(option(0).classList.contains('is-correct')).toBe(true);
    const nextBtn = screen.getByRole('button', { name: /próxima questão/i });
    expect(document.activeElement).toBe(nextBtn);
  });

  it('o botão da última pergunta é "Ver resultado" e o HUD acompanha o progresso', () => {
    render(<Game config={config} />);
    start();
    expect(screen.getByText('✓ 0')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');

    choose(0);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('1');
    expect(screen.getByText('✓ 1')).toBeTruthy();
    next(/próxima questão/i);
    expect(screen.getByText('Questão 2/2')).toBeTruthy();
    choose(1);
    expect(screen.getByRole('button', { name: /ver resultado/i })).toBeTruthy();
  });

  it('não conta o tempo com a aba em segundo plano', () => {
    render(<Game config={config} />);
    start();
    advance(10_000);
    const setHidden = (hidden: boolean) => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
      document.dispatchEvent(new Event('visibilitychange'));
    };
    setHidden(true);
    advance(120_000); // escondida: não conta
    setHidden(false);
    advance(5_000);
    choose(0);
    next();
    choose(1);
    next(/ver resultado/i);
    expect(screen.getByText(/Tempo: 0:15/)).toBeTruthy();
  });

  it('Jogar de novo recomeça do zero', () => {
    render(<Game config={config} />);
    start();
    advance(5_000);
    choose(2);
    next();
    choose(0);
    next(/ver resultado/i);
    fireEvent.click(screen.getByRole('button', { name: /jogar de novo/i }));

    expect(screen.getByText('Questão 1/2')).toBeTruthy();
    expect(screen.getByText('⏱ 0:00')).toBeTruthy();
    expect(screen.getByText('✓ 0')).toBeTruthy();
    expect(document.querySelectorAll('.qz-option.is-correct, .qz-option.is-wrong')).toHaveLength(0);
  });
});
