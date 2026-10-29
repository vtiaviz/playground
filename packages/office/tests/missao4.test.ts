import { getGame } from '@playground/games';
import { describe, expect, it } from 'vitest';
import { BOARD, BOARD_SPOT, findPath, isFree, roomAt, WORKSTATIONS } from '../src/game/map';
import { FRASES_PADRAO } from '../src/mission/missoes';

describe('missão 4: quadro branco', () => {
  it('o quadro fica na Sala de Reuniões e dá para ficar na frente dele', () => {
    expect(roomAt(BOARD.x + BOARD.w / 2, BOARD.y + BOARD.h + 40)?.id).toBe('reunioes');
    expect(roomAt(BOARD_SPOT.x, BOARD_SPOT.y)?.id).toBe('reunioes');
    expect(isFree(BOARD_SPOT.x, BOARD_SPOT.y)).toBe(true);
  });

  it('o Bruno (estação 2) anda da mesa até o quadro e volta', () => {
    expect(findPath(WORKSTATIONS[1].seat, BOARD_SPOT).length).toBeGreaterThan(1);
    expect(findPath(BOARD_SPOT, WORKSTATIONS[1].seat).length).toBeGreaterThan(1);
  });
});

describe('missão 4: jogo de exemplo', () => {
  it('as frases de exemplo são um "Complete as Frases" válido', () => {
    expect(getGame('COMPLETE_FRASES').validateConfig(FRASES_PADRAO.config)).not.toBeNull();
  });
});
