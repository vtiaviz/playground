import { describe, expect, it } from 'vitest';
import {
  expectedSeconds,
  initialLevel,
  measurePerformance,
  nextLevel,
  pickLevel,
  validateLevels,
} from '../src/adaptive';

const quiz = (n: number) => ({
  title: 'Q',
  questions: Array.from({ length: n }, (_, i) => ({ text: `Pergunta ${i}?`, options: ['sim', 'não'], correct: 0 })),
});
const forca = { title: 'F', theme: '', words: ['sol', 'lua', 'mar', 'rio', 'céu'] };

describe('measurePerformance', () => {
  it('tudo certo e no tempo = 100', () => {
    const exp = expectedSeconds('QUIZ', quiz(4));
    expect(exp).toHaveLength(4);
    const items = exp.map((s) => ({ correct: 1, seconds: s * 0.8 }));
    const p = measurePerformance('QUIZ', quiz(4), { score: 600, maxScore: 600, details: { items } });
    expect(p).toMatchObject({ score: 100, accuracy: 100, speed: 100, guesses: 0, basis: 'items' });
  });

  it('acerto pesa 70% e o ritmo 30%', () => {
    const exp = expectedSeconds('QUIZ', quiz(4));
    // metade certa, devagar demais (3× o esperado) = ritmo zero
    const items = exp.map((s, i) => ({ correct: i < 2 ? 1 : 0, seconds: s * 3 }));
    const p = measurePerformance('QUIZ', quiz(4), { score: 200, maxScore: 600, details: { items } });
    expect(p.accuracy).toBe(50);
    expect(p.speed).toBe(0);
    expect(p.score).toBe(35);
  });

  it('erro respondido rápido demais conta como chute e desconta', () => {
    const exp = expectedSeconds('QUIZ', quiz(4));
    const calm = exp.map((s, i) => ({ correct: i < 2 ? 1 : 0, seconds: s }));
    const guess = exp.map((s, i) => ({ correct: i < 2 ? 1 : 0, seconds: i < 2 ? s : 0.5 }));
    const a = measurePerformance('QUIZ', quiz(4), { score: 0, maxScore: 600, details: { items: calm } });
    const b = measurePerformance('QUIZ', quiz(4), { score: 0, maxScore: 600, details: { items: guess } });
    expect(b.guesses).toBe(2);
    expect(b.score).toBe(a.score - 10);
  });

  it('cada "Verificar" das cruzadas desconta 3 (até 15)', () => {
    const items = [{ correct: 1, seconds: 1 }];
    const p = measurePerformance('FORCA', forca, { score: 1, maxScore: 1, details: { items, checks: 10 } });
    expect(p.penalties).toBe(15);
    expect(p.score).toBe(85);
  });

  it('sem itens (versão antiga do jogo) usa a nota', () => {
    const p = measurePerformance('FORCA', forca, { score: 375, maxScore: 750, details: {} });
    expect(p).toMatchObject({ score: 50, basis: 'score', speed: null });
  });

  it('itens malformados são ignorados (cai na nota)', () => {
    const p = measurePerformance('FORCA', forca, { score: 750, maxScore: 750, details: { items: [{ correct: 'x' }] } });
    expect(p.basis).toBe('score');
  });

  it('tendência compara a 2ª metade com a 1ª', () => {
    const items = [0, 0, 1, 1].map((c) => ({ correct: c, seconds: 5 }));
    expect(measurePerformance('QUIZ', quiz(4), { score: 0, maxScore: 1, details: { items } }).trend).toBe(100);
  });
});

describe('nextLevel', () => {
  it('sobe com 2 bons seguidos, ou na hora com desempenho excelente', () => {
    const a = nextLevel({ level: 'normal', streak: 0 }, 82);
    expect(a).toMatchObject({ level: 'normal', streak: 1, change: null });
    expect(nextLevel(a, 85)).toMatchObject({ level: 'hard', streak: 0, change: 'up' });
    expect(nextLevel({ level: 'easy', streak: 0 }, 95)).toMatchObject({ level: 'normal', change: 'up' });
  });

  it('desce com 2 baixos seguidos, ou na hora se muito baixo', () => {
    const a = nextLevel({ level: 'normal', streak: 0 }, 45);
    expect(a).toMatchObject({ level: 'normal', streak: -1 });
    expect(nextLevel(a, 40)).toMatchObject({ level: 'easy', change: 'down' });
    expect(nextLevel({ level: 'hard', streak: 0 }, 20)).toMatchObject({ level: 'normal', change: 'down' });
  });

  it('desempenho médio zera a sequência; sinal contrário também', () => {
    expect(nextLevel({ level: 'normal', streak: 1 }, 65)).toMatchObject({ streak: 0, change: null });
    expect(nextLevel({ level: 'normal', streak: 1 }, 45)).toMatchObject({ streak: -1, change: null });
  });

  it('nos extremos fica onde está; nível fixado não muda', () => {
    expect(nextLevel({ level: 'hard', streak: 0 }, 99)).toMatchObject({ level: 'hard', change: null });
    expect(nextLevel({ level: 'easy', streak: 0 }, 0)).toMatchObject({ level: 'easy', change: null });
    expect(nextLevel({ level: 'normal', streak: 0 }, 99, true)).toMatchObject({ level: 'normal', change: null });
  });

  it('nível inicial = média dos outros jogos', () => {
    expect(initialLevel([])).toBe('normal');
    expect(initialLevel(['hard', 'hard', 'normal'])).toBe('hard');
    expect(initialLevel(['easy', 'normal'])).toBe('normal');
  });
});

describe('validateLevels / pickLevel', () => {
  it('exige pelo menos 2 níveis válidos', () => {
    expect(validateLevels('FORCA', { normal: forca })).toBeNull();
    expect(validateLevels('FORCA', { normal: forca, hard: { words: [] } })).toBeNull();
    expect(validateLevels('FORCA', { normal: forca, chefe: forca })).toBeNull();
    expect(validateLevels('FORCA', { easy: forca, hard: forca })).not.toBeNull();
  });

  it('usa o nível mais próximo quando falta um', () => {
    expect(pickLevel({ normal: 1, hard: 2 }, 'easy')).toBe('normal');
    expect(pickLevel({ easy: 1, hard: 2 }, 'normal')).toBe('easy');
    expect(pickLevel({ easy: 1, normal: 2 }, 'hard')).toBe('normal');
  });
});
