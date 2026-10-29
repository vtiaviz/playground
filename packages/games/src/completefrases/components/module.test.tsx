import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Editor from './Editor';
import Game from './Game';
import { validateConfig, type GameConfig } from '../config';
import { formatSentences, parseDecoys, parseSentences } from '../lib/sentences';

const { sentences } = parseSentences(`1 - A preferência, no trânsito, é de quem vem do lado [direito].
> Quem vem da direita tem a preferência.
2 - O sinal [vermelho] manda [parar].`);
const config: GameConfig = { title: 'Trânsito', sentences, decoys: ['esquerdo', 'verde'] };
const noShuffle = () => 0.999; // Fisher–Yates com random ~1 mantém a ordem original

const chip = (word: string) => screen.getByRole('button', { name: word });
const blank = (n: number) => screen.getByRole('button', { name: new RegExp(`^Lacuna ${n}[,:]`) });
const place = (word: string, n: number) => {
  fireEvent.click(chip(word));
  fireEvent.click(blank(n));
};
const begin = () => fireEvent.click(screen.getByRole('button', { name: 'Começar' }));
const doubleTap = (n: number) => {
  fireEvent.click(blank(n));
  fireEvent.click(blank(n));
};

describe('formato das frases', () => {
  it('lê lacunas, explicações e numeração', () => {
    expect(sentences).toHaveLength(2);
    expect(sentences[0]).toEqual({
      segments: ['A preferência, no trânsito, é de quem vem do lado ', '.'],
      answers: ['direito'],
      explanation: 'Quem vem da direita tem a preferência.',
    });
    expect(sentences[1].answers).toEqual(['vermelho', 'parar']);
  });

  it('formatSentences é o inverso de parseSentences', () => {
    const again = parseSentences(formatSentences(sentences));
    expect(again.errors).toEqual([]);
    expect(again.sentences).toEqual(sentences);
  });

  it('aponta erros por linha', () => {
    const { errors } = parseSentences('Sem lacuna nenhuma.\nLacuna [aberta.\n> solta');
    expect(errors.map((e) => e.line)).toEqual([1, 2, 3]);
    expect(parseSentences('Vazia [] aqui').errors).toHaveLength(1);
  });

  it('palavras extras: ignora repetidas e recusa respostas', () => {
    const r = parseDecoys('esquerdo, Esquerdo; verde\nDireito', sentences);
    expect(r.decoys).toEqual(['esquerdo', 'verde']);
    expect(r.errors).toHaveLength(1);
  });

  it('validateConfig recusa pegadinha igual a resposta e lacunas malformadas', () => {
    expect(validateConfig(config)).not.toBeNull();
    expect(validateConfig({ ...config, decoys: ['DIREITO'] })).toBeNull();
    expect(validateConfig({ ...config, sentences: [{ segments: ['a'], answers: ['b'], explanation: '' }] })).toBeNull();
    expect(validateConfig({ ...config, sentences: [] })).toBeNull();
  });
});

describe('Complete as Frases como módulo', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('onFocusChange: a frase da última lacuna mexida, como está agora', () => {
    const onFocusChange = vi.fn();
    render(<Game config={config} random={noShuffle} onFocusChange={onFocusChange} />);
    begin();
    expect(onFocusChange).toHaveBeenLastCalledWith({
      item: 0,
      state: 'Como a frase está agora: A preferência, no trânsito, é de quem vem do lado [___].',
    });
    place('verde', 2);
    expect(onFocusChange).toHaveBeenLastCalledWith({ item: 1, state: 'Como a frase está agora: O sinal [verde] manda [___].' });
  });

  it('começa pela tela inicial, com o tempo parado', () => {
    render(<Game config={config} random={noShuffle} />);
    expect(screen.getByText(/5 palavras no banco \(2 sobram para confundir\)/)).toBeTruthy();
    expect(screen.queryByLabelText('Banco de palavras')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    begin();
    expect(screen.getByText('⏱ 00:00')).toBeTruthy();
  });

  it('o banco tem as respostas e as pegadinhas', () => {
    render(<Game config={config} random={noShuffle} />);
    begin();
    for (const w of ['direito', 'vermelho', 'parar', 'esquerdo', 'verde']) expect(chip(w)).toBeTruthy();
  });

  it('tocar na palavra e na lacuna preenche; duplo clique devolve ao banco', () => {
    render(<Game config={config} random={noShuffle} />);
    begin();
    place('direito', 1);
    expect(blank(1).textContent).toBe('direito');
    expect(screen.queryByRole('button', { name: 'direito' })).toBeNull(); // saiu do banco
    doubleTap(1);
    expect(blank(1).textContent).toBe('');
    expect(chip('direito')).toBeTruthy();
  });

  it('dois cliques separados não devolvem a palavra', () => {
    render(<Game config={config} random={noShuffle} />);
    begin();
    place('direito', 1);
    fireEvent.click(blank(1));
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    fireEvent.click(blank(1));
    expect(blank(1).textContent).toBe('direito');
  });

  it('Delete numa lacuna preenchida também devolve a palavra', () => {
    render(<Game config={config} random={noShuffle} />);
    begin();
    place('verde', 2);
    fireEvent.keyDown(blank(2), { key: 'Delete' });
    expect(blank(2).textContent).toBe('');
  });

  it('colocar outra palavra numa lacuna preenchida devolve a anterior', () => {
    render(<Game config={config} random={noShuffle} />);
    begin();
    place('verde', 2);
    place('vermelho', 2);
    expect(blank(2).textContent).toBe('vermelho');
    expect(chip('verde')).toBeTruthy();
  });

  it('envio único: só habilita com tudo preenchido, pede confirmação e chama onComplete uma vez', () => {
    const onComplete = vi.fn();
    render(<Game config={config} onComplete={onComplete} allowRestart={false} random={noShuffle} />);
    begin();
    const send = () => screen.getByRole('button', { name: 'Enviar respostas' }) as HTMLButtonElement;
    place('direito', 1);
    place('verde', 2); // errada
    expect(send().disabled).toBe(true);
    place('parar', 3);
    act(() => {
      vi.advanceTimersByTime(65_000);
    });
    fireEvent.click(send());
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar envio' }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    const r = onComplete.mock.calls[0][0];
    expect(r).toMatchObject({ score: 20, maxScore: 30, durationSeconds: 65 });
    expect(r.details).toMatchObject({ correct: 2, total: 3, answers: ['direito', 'verde', 'parar'] });
    expect(r.details.items.map((i: { correct: number }) => i.correct)).toEqual([1, 0, 1]);
    expect(r.details.items.reduce((s: number, i: { seconds: number }) => s + i.seconds, 0)).toBeCloseTo(65, 0);

    // correção por frase, sem banco e sem novos envios
    expect(screen.getByText('Correto.')).toBeTruthy();
    expect(screen.getByText(/Resposta certa: “vermelho”, “parar”/)).toBeTruthy();
    expect(screen.queryByLabelText('Banco de palavras')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Enviar respostas' })).toBeNull();
    expect(screen.queryByRole('button', { name: /jogar de novo/i })).toBeNull();
    expect(screen.getByText('20').parentElement?.textContent).toBe('20 / 30 pontos');
    doubleTap(1);
    expect(blank(1).textContent).toBe('direito'); // travado depois do envio
  });

  it('arrastar do banco para a lacuna e de volta para o banco', () => {
    render(<Game config={config} random={noShuffle} />);
    begin();
    const dt = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(chip('parar'), { dataTransfer: dt });
    fireEvent.dragOver(blank(3), { dataTransfer: dt });
    fireEvent.drop(blank(3), { dataTransfer: dt });
    expect(blank(3).textContent).toBe('parar');

    fireEvent.dragStart(blank(3), { dataTransfer: dt });
    fireEvent.drop(blank(2), { dataTransfer: dt }); // entre lacunas: move
    expect(blank(2).textContent).toBe('parar');
    expect(blank(3).textContent).toBe('');

    fireEvent.dragStart(blank(2), { dataTransfer: dt });
    fireEvent.drop(screen.getByLabelText('Banco de palavras'), { dataTransfer: dt });
    expect(blank(2).textContent).toBe('');
    expect(chip('parar')).toBeTruthy();
  });

  it('o Editor salva uma config válida (exemplo)', () => {
    const onSave = vi.fn();
    render(<Editor onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar jogo' }));
    const saved = onSave.mock.calls[0][0];
    expect(validateConfig(saved)).toEqual(saved);
    expect(saved.sentences).toHaveLength(10);
    expect(saved.sentences.flatMap((x: { answers: string[] }) => x.answers)).toHaveLength(11);
    expect(JSON.stringify(saved)).not.toMatch(/senac/i);
    expect(saved.decoys).toHaveLength(4);
  });

  it('reabre um jogo salvo e devolve a mesma config', () => {
    const onSave = vi.fn();
    render(<Editor initialConfig={config} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar jogo' }));
    expect(onSave.mock.calls[0][0]).toEqual(config);
  });

  it('pegadinha igual a uma resposta desabilita o Salvar', () => {
    render(<Editor initialConfig={config} onSave={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox', { name: /palavras extras/i }), { target: { value: 'direito' } });
    expect((screen.getByRole('button', { name: 'Salvar jogo' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
