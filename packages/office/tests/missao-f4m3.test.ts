import { describe, expect, it } from 'vitest';
import { getGame } from '@playground/games';
import { findPath, FURNITURE, isFree, MEETING_BOSS, roomAt, TRAINING_PAPER, TRAINING_ZONE } from '../src/game/map';
import { FRASES_PADRAO, FRASES_TREINAMENTO_PADRAO, MISSAO_TREINAMENTO } from '../src/mission/missoes';

describe('fase 4, missão 3: as frases do treinamento de TI', () => {
  it('o jogo de exemplo é um Complete as Frases válido, diferente do quadro branco', () => {
    const config = getGame('COMPLETE_FRASES').validateConfig(FRASES_TREINAMENTO_PADRAO.config);
    expect(config).not.toBeNull();
    expect(FRASES_TREINAMENTO_PADRAO.title).not.toBe(FRASES_PADRAO.title);
    expect(MISSAO_TREINAMENTO.xp).toBe(100);
  });

  it('o papel fica em cima da mesa do Marcos, e dá para chegar na frente dela', () => {
    const desk = FURNITURE.find((f) => f.label === 'Mesa da TI')!;
    expect(TRAINING_PAPER.x).toBeGreaterThanOrEqual(desk.x);
    expect(TRAINING_PAPER.x).toBeLessThan(desk.x + desk.w);
    expect(TRAINING_PAPER.y).toBeGreaterThanOrEqual(desk.y);
    expect(TRAINING_PAPER.y).toBeLessThan(desk.y + desk.h);
    const front = { x: TRAINING_ZONE.x + TRAINING_ZONE.w / 2, y: TRAINING_ZONE.y + TRAINING_ZONE.h / 2 };
    expect(roomAt(front.x, front.y)?.id).toBe('ti');
    expect(isFree(front.x, front.y)).toBe(true);
    expect(findPath(MEETING_BOSS, front).length).toBeGreaterThan(0);
  });
});
