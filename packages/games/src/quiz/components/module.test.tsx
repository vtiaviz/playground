import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Editor from './Editor';
import Game from './Game';
import { validateConfig } from '../config';
import { formatQuiz, parseQuiz } from '../lib/quiz';

const { questions } = parseQuiz(`1 - Qual a principal função do HD?
a) Armazenar informações
b) Criar novas paginas web
resposta: a

2 - O que imprime?
\`\`\`js
console.log(1 + 1);
\`\`\`
a) 1
b) 2
c) 11
resposta: b`);
const config = { title: 'Teste', questions };

const option = (i: number) => document.querySelectorAll<HTMLButtonElement>('.qz-option')[i];
const next = (label = /próxima questão|ver resultado/i) => fireEvent.click(screen.getByRole('button', { name: label }));
const playAll = () => {
  fireEvent.click(screen.getByRole('button', { name: /começar/i }));
  act(() => {
    vi.advanceTimersByTime(5_000);
  });
  fireEvent.click(option(0));
  next();
  act(() => {
    vi.advanceTimersByTime(5_000);
  });
  fireEvent.click(option(1));
  next(/ver resultado/i);
};

describe('formatQuiz', () => {
  it('é o inverso de parseQuiz', () => {
    const again = parseQuiz(formatQuiz(questions));
    expect(again.errors).toEqual([]);
    expect(again.questions).toEqual(questions);
  });
});

describe('quiz como módulo', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('onFocusChange: a pergunta aberta para o tutor IA (nada enquanto mostra o resultado)', () => {
    const onFocusChange = vi.fn();
    render(<Game config={config} onFocusChange={onFocusChange} />);
    expect(onFocusChange).not.toHaveBeenCalledWith(expect.objectContaining({ item: 0 }));
    fireEvent.click(screen.getByRole('button', { name: /começar/i }));
    expect(onFocusChange).toHaveBeenLastCalledWith({ item: 0, state: '' });
    act(() => {
      vi.advanceTimersByTime(3_000); // o cronômetro re-renderiza, mas não repete o aviso
    });
    expect(onFocusChange.mock.calls.filter(([f]) => f?.item === 0)).toHaveLength(1);
    fireEvent.click(option(0));
    expect(onFocusChange).toHaveBeenLastCalledWith(null);
    next();
    expect(onFocusChange).toHaveBeenLastCalledWith({ item: 1, state: '' });
  });

  it('onComplete é chamado uma vez, com acertos e bônus', () => {
    const onComplete = vi.fn();
    render(<Game config={config} onComplete={onComplete} />);
    playAll();
    expect(onComplete).toHaveBeenCalledTimes(1);
    const r = onComplete.mock.calls[0][0];
    expect(r.maxScore).toBe(300);
    expect(r.score).toBeGreaterThanOrEqual(200);
    expect(r.score).toBeLessThanOrEqual(300);
    expect(r.details.correct).toBe(2);
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

  it('reabre um quiz salvo (com bloco de código) e devolve as mesmas perguntas', () => {
    const onSave = vi.fn();
    render(<Editor initialConfig={config} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar jogo' }));
    expect(onSave.mock.calls[0][0].questions).toEqual(questions);
  });

  it('texto com erro desabilita o Salvar', () => {
    render(<Editor onSave={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox', { name: /perguntas, alternativas/i }), { target: { value: '1 - Sem resposta\na) x\nb) y' } });
    expect((screen.getByRole('button', { name: 'Salvar jogo' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('quiz: desempenho item a item', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('envia acerto e tempo de cada questão (o feedback não conta) e chama onStart', () => {
    const onComplete = vi.fn();
    const onStart = vi.fn();
    render(<Game config={config} onComplete={onComplete} onStart={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: /começar/i }));
    expect(onStart).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    fireEvent.click(option(0)); // certa
    act(() => {
      vi.advanceTimersByTime(30_000); // lendo o feedback: não conta
    });
    next();
    act(() => {
      vi.advanceTimersByTime(7_000);
    });
    fireEvent.click(option(0)); // errada
    const items = onComplete.mock.calls[0][0].details.items;
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ correct: 1 });
    expect(items[1]).toMatchObject({ correct: 0 });
    expect(items[0].seconds).toBeCloseTo(4, 0);
    expect(items[1].seconds).toBeCloseTo(7, 0);
  });
});
