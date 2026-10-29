import { describe, expect, it } from 'vitest';
import { EXIT_OUTSIDE, findPath, isFree, roomAt, SPAWN } from '../src/game/map';
import { summarize } from '../src/mission/DaySummary';
import { FIM_DIA2, MISSAO_CACA, MISSAO_EXERCICIO, MISSAO_FORCA, MISSAO_LEVANTAMENTO, MISSAO_PLACAS } from '../src/mission/missoes';

describe('fim do 2º dia: dispensado', () => {
  it('o chefe dispensa por hoje, e a última fala fecha o dia', () => {
    expect(FIM_DIA2.dismiss.at(-1)).toContain('dispensado por hoje');
    expect(FIM_DIA2.victory).toContain('Segundo dia');
  });

  it('da porta dá para ir até a calçada, do lado de fora', () => {
    expect(roomAt(SPAWN.x, SPAWN.y)?.id).toBe('entrada');
    expect(isFree(SPAWN.x, SPAWN.y)).toBe(true);
    expect(findPath({ x: EXIT_OUTSIDE.x + 40, y: EXIT_OUTSIDE.y - 20 }, SPAWN).length).toBeGreaterThan(1);
  });

  it('o resumo lista as 5 missões do dia na ordem, com a bronca do levantamento', () => {
    const { rows, penalties, stars } = summarize([
      { mission: MISSAO_LEVANTAMENTO.id, title: MISSAO_LEVANTAMENTO.title, xp: -100, note: 'Levantamento com erro' },
      { mission: MISSAO_LEVANTAMENTO.id, title: MISSAO_LEVANTAMENTO.title, xp: 100 },
      ...[MISSAO_CACA, MISSAO_PLACAS, MISSAO_FORCA, MISSAO_EXERCICIO].map((m) => ({ mission: m.id, title: m.title, xp: m.xp })),
    ]);
    expect(rows.map((r) => r.title)).toEqual([
      MISSAO_LEVANTAMENTO.title,
      MISSAO_CACA.title,
      MISSAO_PLACAS.title,
      MISSAO_FORCA.title,
      MISSAO_EXERCICIO.title,
    ]);
    expect(rows[0]).toMatchObject({ gained: 100, lost: 100 });
    expect(penalties).toBe(1);
    expect(stars).toBe(2);
  });
});
