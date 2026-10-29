import { describe, expect, it } from 'vitest';
import etiquetas from '../src/assets/pecas/etiquetas.json';
import { findPath, isFree, IT_ZONE, landingSpots, PICKUP_RADIUS, roomAt, searchSpot } from '../src/game/map';
import { checkParts, explainWrong, PART_HIDEOUTS, PART_KINDS, partById, PARTS, TARGET, type Bag } from '../src/mission/pecas';
import { HIDEOUTS } from '../src/mission/placas';

const spotOf = (id: string) => {
  const h = HIDEOUTS.find((x) => x.id === id)!;
  return searchSpot(h.host, h.nth);
};
const fullBag = (): Bag => Object.fromEntries(PART_KINDS.map((k) => [k, TARGET[k].id]));

describe('fase 3, missão 1: as peças e a lista', () => {
  it('a lista tem uma peça de cada tipo, e cada tipo tem peça parecida com outra referência', () => {
    expect(PART_KINDS).toHaveLength(8);
    for (const k of PART_KINDS) {
      const want = TARGET[k];
      expect(want.kind).toBe(k);
      const decoys = PARTS.filter((p) => p.kind === k && p.id !== want.id);
      expect(decoys.length, k).toBeGreaterThan(0);
      for (const d of decoys) expect(`${d.brand} ${d.type} ${d.spec}`, d.id).not.toBe(`${want.brand} ${want.type} ${want.spec}`);
    }
    // algumas parecidas têm o mesmo desenho da certa: só o adesivo diferencia
    expect(PARTS.filter((p) => !p.id.endsWith('-lista') && p.art === TARGET[p.kind].art).length).toBeGreaterThanOrEqual(5);
    expect(new Set(PARTS.map((p) => p.id)).size).toBe(PARTS.length);
  });

  it('cada desenho tem a imagem e o adesivo dentro dela', () => {
    for (const p of PARTS) {
      const l = (etiquetas.labels as Record<string, number[]>)[p.art];
      expect(l, p.art).toBeDefined();
      const [x, y, w, h] = l;
      expect(x >= 0 && y >= 0 && x + w <= etiquetas.w && y + h <= etiquetas.h, p.art).toBe(true);
      expect(w, p.art).toBeGreaterThanOrEqual(24);
    }
  });

  it('cada peça está escondida em um só móvel com lupa, e um móvel tem só bagunça', () => {
    const all = PART_HIDEOUTS.flatMap((h) => h.parts);
    expect(all.sort()).toEqual(PARTS.map((p) => p.id).sort());
    for (const h of PART_HIDEOUTS) expect(HIDEOUTS.some((x) => x.id === h.hideout), h.hideout).toBe(true);
    expect(PART_HIDEOUTS.some((h) => !h.parts.length)).toBe(true);
  });

  it('as peças caem no chão livre, na mesma sala, longe do ESTAGIÁRIO e uma longe da outra', () => {
    for (const h of PART_HIDEOUTS.filter((x) => x.parts.length)) {
      const zone = spotOf(h.hideout).zone;
      const others = [...HIDEOUTS.filter((x) => x.id !== h.hideout).map((x) => spotOf(x.id).zone), IT_ZONE];
      for (let y = zone.y + 1; y < zone.y + zone.h; y += 3)
        for (let x = zone.x + 1; x < zone.x + zone.w; x += 3) {
          if (!isFree(x, y)) continue;
          const from = { x, y };
          const land = landingSpots(from, h.parts.length, others);
          expect(land, `${h.hideout} de (${x}, ${y})`).toHaveLength(h.parts.length);
          for (const p of land) {
            expect(roomAt(p.x, p.y)?.id).toBe(roomAt(x, y)?.id);
            expect(Math.hypot(p.x - x, p.y - y)).toBeGreaterThan(PICKUP_RADIUS + 6);
            expect(findPath(from, p).length).toBeGreaterThan(1);
          }
          for (let i = 0; i < land.length; i++)
            for (let j = i + 1; j < land.length; j++)
              expect(Math.hypot(land[i].x - land[j].x, land[i].y - land[j].y)).toBeGreaterThan(PICKUP_RADIUS * 2);
        }
    }
  });
});

describe('fase 3, missão 1: entrega ao Marcos', () => {
  it('faltando tipo, diz quais faltam e não confere', () => {
    const bag = fullBag();
    delete bag.ram;
    delete bag.hd;
    expect(checkParts(bag)).toEqual({ ok: false, missing: ['ram', 'hd'] });
    expect(checkParts({ ...bag }, ['ram', 'hd'])).toMatchObject({ ok: true });
  });

  it('com todas as certas, passa; com parecidas, devolve só as erradas', () => {
    expect(checkParts(fullBag())).toEqual({ ok: true, right: PART_KINDS, wrong: [] });
    const r = checkParts({ ...fullBag(), ram: 'ram-ddr3', cooler: 'cooler-lga' });
    expect(r.ok && r.wrong.map((w) => w.got.id)).toEqual(['cooler-lga', 'ram-ddr3']);
    expect(r.ok && r.right).toHaveLength(6);
  });

  it('o Marcos explica a diferença pelo adesivo', () => {
    const text = explainWrong('ram', partById('ram-ddr3')!);
    expect(text).toContain('DDR3');
    expect(text).toContain('DDR4 · 8 GB');
    expect(text.startsWith('A memória')).toBe(true);
  });
});
