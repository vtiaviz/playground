import { describe, expect, it } from 'vitest';
import { getGame } from '@playground/games';
import { besidePlayer, COPA_RITA_WAIT, findPath, isFree, RH_WAIT, roomAt, WATER_SPOT } from '../src/game/map';
import { CRUZADAS_PADRAO, CRUZADAS_RITA_PADRAO, MISSAO_CRUZADAS_RITA } from '../src/mission/missoes';

const TILE = 32;

describe('fase 3, missão 2: as palavras-cruzadas da Rita', () => {
  it('as palavras-cruzadas de exemplo são válidas, diferentes das do CEO, e cabem no tablet', () => {
    const config = getGame('CRUZADAS').validateConfig(CRUZADAS_RITA_PADRAO.config);
    expect(config).not.toBeNull();
    expect(CRUZADAS_RITA_PADRAO.title).not.toBe(CRUZADAS_PADRAO.title);
    const { layout } = CRUZADAS_RITA_PADRAO.config as { layout: { rows: number; cols: number; words: { answer: string }[] } };
    expect(layout.words.length).toBeGreaterThanOrEqual(6);
    expect(Math.max(layout.rows, layout.cols)).toBeLessThanOrEqual(12);
  });

  it('a Rita consegue correr do RH até a porta da Copa e parar do lado do ESTAGIÁRIO', () => {
    expect(roomAt(RH_WAIT.x, RH_WAIT.y)?.id).toBe('rh');
    // o ESTAGIÁRIO acabou de entrar na Copa pela porta da esquerda
    const player = { x: 36 * TILE, y: 15.8 * TILE };
    expect(roomAt(player.x, player.y)?.id).toBe('copa');
    expect(isFree(player.x, player.y)).toBe(true);
    // ele entrou andando para a direita: ela para atrás dele, na porta
    const stop = besidePlayer(player, { x: player.x - 100, y: player.y });
    expect(stop.x).toBeLessThan(player.x);
    expect(isFree(stop.x, stop.y)).toBe(true);
    expect(Math.hypot(stop.x - player.x, stop.y - player.y)).toBeLessThanOrEqual(30);
    expect(findPath(RH_WAIT, stop).length).toBeGreaterThan(1);
  });

  it('o bebedouro e o canto onde a Rita espera ficam na Copa, com caminho até eles', () => {
    for (const p of [WATER_SPOT, COPA_RITA_WAIT]) {
      expect(roomAt(p.x, p.y)?.id).toBe('copa');
      expect(isFree(p.x, p.y)).toBe(true);
    }
    expect(findPath({ x: 36 * TILE, y: 15.8 * TILE }, WATER_SPOT).length).toBeGreaterThan(0);
    expect(findPath(COPA_RITA_WAIT, RH_WAIT).length).toBeGreaterThan(1);
  });

  it('vale 100 XP e pergunta se ele vai ajudar', () => {
    expect(MISSAO_CRUZADAS_RITA.xp).toBe(100);
    expect(MISSAO_CRUZADAS_RITA.question).toContain('ajudar');
  });
});
