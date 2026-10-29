import { describe, expect, it } from 'vitest';
import { findPath, isFree, RH_HOME, RH_STATIONS, RH_WAIT, roomAt, TILE } from '../src/game/map';

describe('missão 3: RH e Financeiro', () => {
  it('tem uma mesa nova com caixa no RH e outra no Financeiro', () => {
    expect(RH_STATIONS.map((s) => s.room)).toEqual(['rh', 'financeiro']);
    for (const s of RH_STATIONS) {
      expect(roomAt(s.desk.x + s.desk.w / 2, s.desk.foot!.y)?.id).toBe(s.room);
      expect(roomAt(s.box.x + s.box.w / 2, s.box.foot!.y)?.id).toBe(s.room);
    }
  });

  it('dá para ficar na frente de cada caixa', () => {
    for (const s of RH_STATIONS) {
      const cx = s.zone.x + s.zone.w / 2;
      expect(isFree(cx, s.zone.y + 14)).toBe(true);
      expect(roomAt(cx, s.zone.y + 14)?.id).toBe(s.room);
    }
  });

  it('a responsável do RH tem lugar livre na Copa, no RH e na frente das mesas', () => {
    expect(roomAt(RH_HOME.x, RH_HOME.y)?.id).toBe('copa');
    for (const p of [RH_HOME, RH_WAIT, ...RH_STATIONS.map((s) => s.spot)]) expect(isFree(p.x, p.y)).toBe(true);
    expect(roomAt(RH_WAIT.x, RH_WAIT.y)?.id).toBe('rh');
  });

  it('ela anda da Copa até o RH e entre as mesas', () => {
    expect(findPath(RH_HOME, RH_WAIT).length).toBeGreaterThan(1);
    expect(findPath(RH_WAIT, RH_STATIONS[0].spot).length).toBeGreaterThan(1);
    expect(findPath(RH_STATIONS[0].spot, RH_STATIONS[1].spot).length).toBeGreaterThan(1);
    expect(findPath(RH_STATIONS[1].spot, RH_HOME).length).toBeGreaterThan(1);
  });

  it('o ESTAGIÁRIO chega nas caixas andando desde o corredor', () => {
    const corredor = { x: 23.5 * TILE, y: 10.5 * TILE };
    for (const s of RH_STATIONS) expect(findPath(corredor, { x: s.zone.x + s.zone.w / 2, y: s.zone.y + 14 }).length).toBeGreaterThan(1);
  });
});
