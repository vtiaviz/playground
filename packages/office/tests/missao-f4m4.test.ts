import { describe, expect, it } from 'vitest';
import { getGame } from '@playground/games';
import { FURNITURE, QUIZ_PAPER, TRAINING_PAPER } from '../src/game/map';
import { MISSAO_QUIZ_TREINAMENTO, QUIZ_ALINHAMENTO_PADRAO, QUIZ_PADRAO, QUIZ_TREINAMENTO_PADRAO } from '../src/mission/missoes';

describe('fase 4, missão 4: o quiz do treinamento de TI', () => {
  it('o quiz de exemplo é válido, novo, e as respostas certas não ficam sempre na mesma letra', () => {
    const config = getGame('QUIZ').validateConfig(QUIZ_TREINAMENTO_PADRAO.config);
    expect(config).not.toBeNull();
    expect([QUIZ_PADRAO.title, QUIZ_ALINHAMENTO_PADRAO.title]).not.toContain(QUIZ_TREINAMENTO_PADRAO.title);
    const correct = (QUIZ_TREINAMENTO_PADRAO.config as { questions: { correct: number }[] }).questions.map((q) => q.correct);
    expect(new Set(correct).size).toBeGreaterThanOrEqual(3);
    expect(MISSAO_QUIZ_TREINAMENTO.xp).toBe(100);
  });

  it('a segunda folha fica em cima da mesa do Marcos, sem cobrir a primeira', () => {
    const desk = FURNITURE.find((f) => f.label === 'Mesa da TI')!;
    const SHEET = 26; // 13 pixels de arte, ampliados 2x
    expect(QUIZ_PAPER.x).toBeGreaterThanOrEqual(desk.x);
    expect(QUIZ_PAPER.x + SHEET).toBeLessThanOrEqual(desk.x + desk.w);
    expect(QUIZ_PAPER.y).toBeGreaterThanOrEqual(desk.y);
    expect(QUIZ_PAPER.x).toBeGreaterThanOrEqual(TRAINING_PAPER.x + SHEET);
  });
});
