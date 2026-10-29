import { describe, expect, it } from 'vitest';
import { GAME_TYPES } from '../src/types';
import { isGameType, maxScoreFor, validateGameConfig } from '../src/validate';

describe('validate (entrada usada pelo servidor)', () => {
  it('isGameType', () => {
    for (const t of GAME_TYPES) expect(isGameType(t)).toBe(true);
    expect(isGameType('XADREZ')).toBe(false);
    expect(isGameType(undefined)).toBe(false);
  });

  it('aceita configs corretas e devolve a versão limpa', () => {
    const forca = validateGameConfig('FORCA', { title: 'T', theme: '', words: ['sol', 'lua', 'mar', 'rio', 'céu'] });
    expect(forca).not.toBeNull();
    expect(maxScoreFor('FORCA', forca)).toBe(750);

    const quiz = validateGameConfig('QUIZ', { title: 'Q', questions: [{ text: 'a?', options: ['x', 'y'], correct: 1 }] });
    expect(quiz).not.toBeNull();
    expect(maxScoreFor('QUIZ', quiz)).toBeGreaterThan(0);

    const frases = validateGameConfig('COMPLETE_FRASES', {
      title: 'F',
      sentences: [{ segments: ['Lado ', '.'], answers: ['direito'] }],
      decoys: ['esquerdo'],
    });
    expect(frases).toMatchObject({ title: 'F', sentences: [{ explanation: '' }] });
    expect(maxScoreFor('COMPLETE_FRASES', frases)).toBe(10);
  });

  it('recusa lixo', () => {
    expect(validateGameConfig('FORCA', null)).toBeNull();
    expect(validateGameConfig('FORCA', { title: 'T', words: ['a'] })).toBeNull();
    expect(validateGameConfig('QUIZ', { title: 'Q', questions: [{ text: 'a?', options: ['x'], correct: 3 }] })).toBeNull();
    expect(validateGameConfig('CRUZADAS', {})).toBeNull();
    expect(validateGameConfig('CACA_PALAVRAS', { title: 'x', words: [] })).toBeNull();
    expect(validateGameConfig('COMPLETE_FRASES', { title: 'x', sentences: [{ segments: ['a', 'b'], answers: [''] }] })).toBeNull();
  });
});
