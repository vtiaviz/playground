import { getGame } from '@playground/games';
import { describe, expect, it } from 'vitest';
import { COPA_CHAT, COPA_CORNER, findPath, isFree, RH_HOME, roomAt, WORKSTATIONS } from '../src/game/map';
import { MISSAO_PROVA, QUIZ_PADRAO } from '../src/mission/missoes';

describe('missão 5: a prova no tablet, na Copa', () => {
  it('o lugar da conversa e o cantinho ficam livres, dentro da Copa', () => {
    for (const p of [COPA_CHAT, COPA_CORNER]) {
      expect(roomAt(p.x, p.y)?.id).toBe('copa');
      expect(isFree(p.x, p.y)).toBe(true);
    }
  });

  it('a conversa é ao lado da Rita e o cantinho fica longe dela', () => {
    expect(Math.hypot(COPA_CHAT.x - RH_HOME.x, COPA_CHAT.y - RH_HOME.y)).toBeLessThan(80);
    expect(Math.hypot(COPA_CORNER.x - RH_HOME.x, COPA_CORNER.y - RH_HOME.y)).toBeGreaterThan(120);
  });

  it('a Elisa (estação 5) anda da mesa até a Copa, vai para o canto e volta', () => {
    const seat = WORKSTATIONS[MISSAO_PROVA.colleague].seat;
    expect(findPath(seat, COPA_CHAT).length).toBeGreaterThan(1);
    expect(findPath(COPA_CHAT, COPA_CORNER).length).toBeGreaterThan(1);
    expect(findPath(COPA_CORNER, seat).length).toBeGreaterThan(1);
  });

  it('o quiz de exemplo é um Quiz válido', () => {
    expect(getGame('QUIZ').validateConfig(QUIZ_PADRAO.config)).not.toBeNull();
  });

  it('o texto de nova tentativa mostra o placar', () => {
    expect(MISSAO_PROVA.retry(4, 6)).toContain('4 de 6');
  });
});
