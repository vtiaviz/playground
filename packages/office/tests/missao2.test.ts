import { describe, expect, it } from 'vitest';
import { CEO_FRONT, findPath, isFree, MEETING_SPOTS, roomAt, WORKSTATIONS } from '../src/game/map';

const near = (a: { x: number; y: number }, b: { x: number; y: number }, d = 24) => Math.hypot(a.x - b.x, a.y - b.y) <= d;

describe('missão 2: mapa', () => {
  it('tem 6 estações de trabalho com colega e mesa', () => {
    expect(WORKSTATIONS).toHaveLength(6);
    for (const w of WORKSTATIONS) expect(w.look).toBeGreaterThanOrEqual(0);
  });

  it('os lugares da reunião ficam livres e dentro da Sala de Reuniões', () => {
    for (const s of MEETING_SPOTS) {
      expect(isFree(s.x, s.y)).toBe(true);
      expect(roomAt(s.x, s.y)?.id).toBe('reunioes');
    }
  });

  it.each(WORKSTATIONS.map((w) => [w.index + 1, w] as const))('o colega %i acha caminho até a reunião e de volta', (_n, w) => {
    const ida = findPath(w.seat, MEETING_SPOTS[w.index]);
    expect(near(ida[ida.length - 1], MEETING_SPOTS[w.index])).toBe(true);
    expect(ida.length).toBeGreaterThan(1);
    const reclamar = findPath(w.seat, CEO_FRONT);
    expect(near(reclamar[reclamar.length - 1], CEO_FRONT)).toBe(true);
  });

  it('dá para o ESTAGIÁRIO ficar na frente de cada mesa', () => {
    for (const w of WORKSTATIONS) {
      const cx = w.zone.x + w.zone.w / 2;
      const cy = w.zone.y + w.zone.h / 2;
      expect(isFree(cx, cy), `estação ${w.index + 1}`).toBe(true);
    }
  });
});
