import { describe, expect, it } from 'vitest';
import { getGame } from '@playground/games';
import { CEO_SEAT, findPath, isFree, MEETING_BOSS, MEETING_SEAT, MEETING_SEAT_ZONE, roomAt } from '../src/game/map';
import { MISSAO_ALINHAMENTO, QUIZ_ALINHAMENTO_PADRAO, QUIZ_PADRAO, QUIZ_SURPRESA_PADRAO } from '../src/mission/missoes';

describe('fase 3, missão 4: o quiz da reunião de alinhamento', () => {
  it('o quiz de exemplo é válido, diferente dos outros, e cada pergunta tem a resposta entre as opções', () => {
    expect(getGame('QUIZ').validateConfig(QUIZ_ALINHAMENTO_PADRAO.config)).not.toBeNull();
    expect(new Set([QUIZ_ALINHAMENTO_PADRAO.title, QUIZ_PADRAO.title, QUIZ_SURPRESA_PADRAO.title]).size).toBe(3);
    const { questions } = QUIZ_ALINHAMENTO_PADRAO.config as { questions: { options: string[]; correct: number }[] };
    expect(questions.length).toBeGreaterThanOrEqual(6);
    for (const q of questions) expect(q.options[q.correct]).toBeDefined();
    // as respostas certas não ficam todas na mesma posição
    expect(new Set(questions.map((q) => q.correct)).size).toBeGreaterThanOrEqual(3);
  });

  it('o chefe chega da Diretoria na ponta da mesa, e a cadeira do ESTAGIÁRIO tem caminho', () => {
    expect(roomAt(MEETING_BOSS.x, MEETING_BOSS.y)?.id).toBe('reunioes');
    expect(isFree(MEETING_BOSS.x, MEETING_BOSS.y)).toBe(true);
    expect(findPath(CEO_SEAT, MEETING_BOSS).length).toBeGreaterThan(1);
    const { approach } = MEETING_SEAT;
    expect(roomAt(approach.x, approach.y)?.id).toBe('reunioes');
    expect(isFree(approach.x, approach.y)).toBe(true);
    expect(findPath({ x: 544, y: 300 }, approach).length).toBeGreaterThan(1);
    const z = MEETING_SEAT_ZONE;
    expect(approach.x >= z.x && approach.x <= z.x + z.w && approach.y >= z.y && approach.y <= z.y + z.h).toBe(true);
  });

  it('dá 100 XP e o chefe comenta o resultado', () => {
    expect(MISSAO_ALINHAMENTO.xp).toBe(100);
    expect(MISSAO_ALINHAMENTO.result(7, 8, true)).toContain('nível que a gente esperava');
    expect(MISSAO_ALINHAMENTO.result(3, 8, false)).toContain('3 de 8');
  });
});
