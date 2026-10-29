import { describe, expect, it } from 'vitest';
import { BOARD_CROWD, BOARD_ZONE, findPath, isFree, roomAt, WORKSTATIONS } from '../src/game/map';
import { CACA_PALAVRAS_PADRAO } from '../src/mission/missoes';
import { getGame } from '@playground/games';

const overlaps = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

describe('fase 2, missão 2: caça-palavras no quadro da Sala de Reuniões', () => {
  it('os colegas ficam em pé dos lados do quadro, sem tampar a frente, e chegam lá andando', () => {
    for (const [i, p] of BOARD_CROWD.entries()) {
      expect(roomAt(p.x, p.y)?.id, `colega ${i}`).toBe('reunioes');
      expect(isFree(p.x, p.y), `colega ${i}`).toBe(true);
      expect(overlaps({ x: p.x - 10, y: p.y - 10, w: 20, h: 10 }, BOARD_ZONE), `colega ${i}`).toBe(false);
      expect(findPath(WORKSTATIONS[5].seat, p).length).toBeGreaterThan(1);
    }
  });

  it('dá para chegar na frente do quadro', () => {
    let free = false;
    for (let y = BOARD_ZONE.y + 2; y < BOARD_ZONE.y + BOARD_ZONE.h; y += 4)
      for (let x = BOARD_ZONE.x + 2; x < BOARD_ZONE.x + BOARD_ZONE.w; x += 4) free ||= isFree(x, y);
    expect(free).toBe(true);
    expect(roomAt(BOARD_ZONE.x + BOARD_ZONE.w / 2, BOARD_ZONE.y + BOARD_ZONE.h / 2)?.id).toBe('reunioes');
  });

  it('o caça-palavras de exemplo é válido e tem as palavras da aula', () => {
    const config = getGame('CACA_PALAVRAS').validateConfig(CACA_PALAVRAS_PADRAO.config);
    expect(config).not.toBeNull();
    const words = (CACA_PALAVRAS_PADRAO.config as { words: string[] }).words;
    for (const w of ['DESKTOP', 'NOTEBOOK', 'SERVIDOR', 'MAINFRAME', 'TABLET', 'SMARTPHONE']) expect(words).toContain(w);
  });
});
