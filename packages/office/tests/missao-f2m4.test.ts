import { describe, expect, it } from 'vitest';
import { getGame, type GameResult } from '@playground/games';
import { findPath, IT_EXIT, IT_SEAT, IT_TABLET_DESK, IT_TABLET_FLOOR, IT_TABLET_ZONE, IT_WAIT, IT_ZONE, isFree, roomAt } from '../src/game/map';
import { checkHangman, clockAt, jingleVolume } from '../src/mission/forca';
import { FORCA_PADRAO, MISSAO_FORCA } from '../src/mission/missoes';

const result = (wordsWon: number, words = 5): GameResult => ({
  score: 500,
  maxScore: 750,
  durationSeconds: 60,
  details: { wordsWon, words: Array.from({ length: words }, (_, i) => ({ word: `W${i}`, won: i < wordsWon })) },
});

const overlaps = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

describe('fase 2, missão 4: a forca do tablet do Marcos', () => {
  it('a forca de exemplo é válida e tem as palavras do dia', () => {
    const config = getGame('FORCA').validateConfig(FORCA_PADRAO.config);
    expect(config).not.toBeNull();
    expect((FORCA_PADRAO.config as { words: string[] }).words).toEqual(expect.arrayContaining(['ARDUINO', 'RASPBERRY', 'MAINFRAME']));
  });

  it('só conta como resolvida com todas as palavras certas', () => {
    expect(checkHangman(result(5))).toEqual({ solved: true, wordsWon: 5, words: 5 });
    expect(checkHangman(result(4))).toEqual({ solved: false, wordsWon: 4, words: 5 });
    expect(checkHangman({ score: 0, maxScore: 0, durationSeconds: 0, details: {} }).solved).toBe(false);
  });

  it('o relógio do topo passa de 14:05 para 14:40', () => {
    expect(clockAt(MISSAO_FORCA.clockFrom, MISSAO_FORCA.clockMinutes, 0)).toBe('14:05');
    expect(clockAt(MISSAO_FORCA.clockFrom, MISSAO_FORCA.clockMinutes, 0.5)).toBe('14:23');
    expect(clockAt(MISSAO_FORCA.clockFrom, MISSAO_FORCA.clockMinutes, 1)).toBe('14:40');
  });

  it('a musiquinha é mais alta perto do tablet e nunca some de todo', () => {
    expect(jingleVolume(0)).toBe(1);
    expect(jingleVolume(300)).toBeLessThan(jingleVolume(100));
    expect(jingleVolume(5000)).toBe(0.12);
  });

  it('o tablet cai num lugar livre da Sala de TI, dá para chegar nele e a área não encosta na do Marcos', () => {
    expect(roomAt(IT_TABLET_FLOOR.x, IT_TABLET_FLOOR.y)?.id).toBe('ti');
    expect(isFree(IT_TABLET_FLOOR.x, IT_TABLET_FLOOR.y)).toBe(true);
    expect(findPath(IT_WAIT, IT_TABLET_FLOOR).length).toBeGreaterThan(1);
    expect(overlaps(IT_TABLET_ZONE, IT_ZONE)).toBe(false);
    expect(findPath(IT_WAIT, IT_SEAT).length).toBeGreaterThan(1);
    expect(roomAt(IT_TABLET_DESK.x, IT_TABLET_DESK.y)?.id).toBe('ti');
  });

  it('o ESTAGIÁRIO sai correndo do tablet até fora da Sala de TI', () => {
    expect(roomAt(IT_EXIT.x, IT_EXIT.y)?.id ?? null).not.toBe('ti');
    expect(isFree(IT_EXIT.x, IT_EXIT.y)).toBe(true);
    const path = findPath(IT_TABLET_FLOOR, IT_EXIT);
    expect(path.length).toBeGreaterThan(1);
    expect(path[path.length - 1]).toEqual(IT_EXIT);
  });
});
