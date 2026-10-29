import { describe, expect, it } from 'vitest';
import { findPath, IT_WAIT, IT_ZONE, isFree, landingSpots, PICKUP_RADIUS, roomAt, searchSpot } from '../src/game/map';
import { BOARD_TOTAL, BOARDS, checkDelivery, familyCount, HIDDEN_BOARDS, HIDEOUTS } from '../src/mission/placas';

const spotOf = (id: string) => {
  const h = HIDEOUTS.find((x) => x.id === id)!;
  return searchSpot(h.host, h.nth);
};

/** Pontos livres dentro da área (onde o ESTAGIÁRIO pode estar quando a busca começa). */
function freePointsIn(z: { x: number; y: number; w: number; h: number }, step = 6) {
  const out: { x: number; y: number }[] = [];
  for (let y = z.y + 1; y < z.y + z.h; y += step) for (let x = z.x + 1; x < z.x + z.w; x += step) if (isFree(x, y)) out.push({ x, y });
  return out;
}

const overlaps = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

describe('placas: onde estão escondidas', () => {
  it('são 10 placas, Arduinos e Raspberry Pi, e pelo menos um esconderijo é só bagunça', () => {
    expect(BOARD_TOTAL).toBe(10);
    expect(familyCount()).toEqual({ arduino: 5, raspberry: 5 });
    expect(new Set(HIDDEN_BOARDS.map((b) => b.model)).size).toBe(Object.keys(BOARDS).length);
    expect(HIDEOUTS.some((h) => !h.boards.length)).toBe(true);
    expect(new Set(HIDEOUTS.map((h) => h.id)).size).toBe(HIDEOUTS.length);
    expect(new Set(HIDDEN_BOARDS.map((b) => b.id)).size).toBe(BOARD_TOTAL);
  });

  it('cada móvel com lupa está na sala certa e dá para chegar na frente dele', () => {
    for (const h of HIDEOUTS) {
      const spot = spotOf(h.id);
      const points = freePointsIn(spot.zone);
      expect(points.length, h.id).toBeGreaterThan(0);
      expect(roomAt(points[0].x, points[0].y)?.id, h.id).toBe(h.room);
      expect(findPath(IT_WAIT, points[0]).length, h.id).toBeGreaterThan(1);
    }
  });

  it('as áreas de busca não se encostam, nem na do Marcos', () => {
    const zones = HIDEOUTS.map((h) => ({ id: h.id, z: spotOf(h.id).zone }));
    for (let i = 0; i < zones.length; i++)
      for (let j = i + 1; j < zones.length; j++) expect(overlaps(zones[i].z, zones[j].z), `${zones[i].id} × ${zones[j].id}`).toBe(false);
    for (const { id, z } of zones) expect(overlaps(z, IT_ZONE), id).toBe(false);
  });

  it('as placas caem no chão livre, na mesma sala, longe do ESTAGIÁRIO e uma longe da outra', () => {
    for (const h of HIDEOUTS.filter((x) => x.boards.length)) {
      for (const from of freePointsIn(spotOf(h.id).zone, 2)) {
        const others = [...HIDEOUTS.filter((x) => x.id !== h.id).map((x) => spotOf(x.id).zone), IT_ZONE];
        const land = landingSpots(from, h.boards.length, others);
        expect(land, `${h.id} de (${from.x}, ${from.y})`).toHaveLength(h.boards.length);
        for (const p of land) {
          expect(isFree(p.x, p.y), h.id).toBe(true);
          expect(roomAt(p.x, p.y)?.id, h.id).toBe(h.room);
          expect(Math.hypot(p.x - from.x, p.y - from.y), h.id).toBeGreaterThan(PICKUP_RADIUS + 6);
          expect(findPath(from, p).length, h.id).toBeGreaterThan(1);
          for (const z of others) expect(p.x >= z.x - 4 && p.x < z.x + z.w + 4 && p.y >= z.y && p.y < z.y + z.h, h.id).toBe(false);
        }
        if (land.length === 2) expect(Math.hypot(land[0].x - land[1].x, land[0].y - land[1].y)).toBeGreaterThan(PICKUP_RADIUS * 2);
      }
    }
  });
});

describe('placas: entrega para o Marcos', () => {
  it('com as 10, a entrega está certa', () => {
    expect(checkDelivery(10, 11)).toEqual({ ok: true });
  });

  it('faltando placa, diz quantas faltam e se ainda tem armário para procurar', () => {
    expect(checkDelivery(7, 9)).toEqual({ ok: false, got: 7, missing: 3, allSearched: false });
    expect(checkDelivery(9, HIDEOUTS.length)).toEqual({ ok: false, got: 9, missing: 1, allSearched: true });
  });
});
