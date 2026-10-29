import { describe, expect, it } from 'vitest';
import { getGame, type GameResult } from '@playground/games';
import { checkExercise, PASS_RATIO } from '../src/mission/exercicio';
import { MISSAO_EXERCICIO, MISSAO_FORCA, QUIZ_PADRAO, QUIZ_SURPRESA_PADRAO } from '../src/mission/missoes';

const result = (correct: number, total = 6): GameResult => ({
  score: correct * 100,
  maxScore: total * 150,
  durationSeconds: 60,
  details: { correct, total },
});

describe('fase 2, missão 5: o exercício surpresa no celular', () => {
  it('o quiz de exemplo é válido, diferente da prova da Elisa, e cada pergunta tem a resposta entre as opções', () => {
    const config = getGame('QUIZ').validateConfig(QUIZ_SURPRESA_PADRAO.config);
    expect(config).not.toBeNull();
    expect(QUIZ_SURPRESA_PADRAO.title).not.toBe(QUIZ_PADRAO.title);
    const { questions } = QUIZ_SURPRESA_PADRAO.config as { questions: { options: string[]; correct: number }[] };
    expect(questions.length).toBeGreaterThanOrEqual(5);
    for (const q of questions) expect(q.options[q.correct]).toBeDefined();
  });

  it('passa com pelo menos 70% de acertos', () => {
    expect(PASS_RATIO).toBe(0.7);
    expect(checkExercise(result(6))).toEqual({ passed: true, right: 6, total: 6, needed: 5 });
    expect(checkExercise(result(5))).toEqual({ passed: true, right: 5, total: 6, needed: 5 });
    expect(checkExercise(result(4))).toEqual({ passed: false, right: 4, total: 6, needed: 5 });
    // 70% de 10 é exatamente 7
    expect(checkExercise(result(7, 10))).toMatchObject({ passed: true, needed: 7 });
    expect(checkExercise(result(6, 10)).passed).toBe(false);
    expect(checkExercise({ score: 0, maxScore: 0, durationSeconds: 0, details: {} }).passed).toBe(false);
  });

  it('a mensagem chega depois da forca, e o amigo diz quantas precisa acertar', () => {
    expect(MISSAO_EXERCICIO.at).toBeGreaterThan(MISSAO_FORCA.clockFrom + MISSAO_FORCA.clockMinutes);
    expect(MISSAO_EXERCICIO.failed(5, 6)).toContain('5 de 6');
    expect(MISSAO_EXERCICIO.sent(4, 6)).toContain('4 de 6');
    expect(MISSAO_EXERCICIO.xp).toBe(100);
  });
});
