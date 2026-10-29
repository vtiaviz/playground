import { describe, expect, it } from 'vitest';
import cena from '../src/assets/impressora/cena.json';
import { findPath, isFree, MEETING_BOSS, OBJECTS, PRINT_DESK, PRINTER, roomAt } from '../src/game/map';
import {
  COPIES,
  missingCables,
  newPrinterState,
  parseCopies,
  PLUGS,
  PORTS,
  tryConfirm,
  tryPlug,
  tryPrint,
  type PrinterState,
} from '../src/mission/impressao';

const overlaps = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const mid = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** Aplica uma tentativa que tem que dar certo. */
const ok = (r: ReturnType<typeof tryPlug>): PrinterState => {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};
const wired = () => ok(tryPlug(ok(tryPlug(newPrinterState(), 'rede', 'rede')), 'energia', 'energia'));

describe('fase 4, missão 2: as 10 cópias da reunião', () => {
  it('a mesa do PC fica na Sala de Impressão, sem bater em móvel, e dá para chegar no PC e na impressora', () => {
    expect(roomAt(PRINT_DESK.foot.x, PRINT_DESK.foot.y + PRINT_DESK.foot.h)?.id).toBe('impressao');
    for (const o of OBJECTS) expect(overlaps(PRINT_DESK.foot, o), o.label).toBe(false);
    for (const zone of [PRINT_DESK.zone, PRINTER.zone]) {
      const front = mid(zone);
      expect(roomAt(front.x, front.y)?.id).toBe('impressao');
      expect(isFree(front.x, front.y)).toBe(true);
      expect(overlaps(zone, PRINT_DESK.foot)).toBe(false);
      expect(findPath(MEETING_BOSS, front).length).toBeGreaterThan(0);
    }
  });

  it('cada cabo só encaixa na entrada dele (o de rede não serve na USB)', () => {
    const s = newPrinterState();
    const usb = tryPlug(s, 'rede', 'usb');
    expect(usb.ok).toBe(false);
    if (!usb.ok) expect(usb.reason).toContain('LAN');
    expect(tryPlug(s, 'energia', 'rede').ok).toBe(false);
    expect(tryPlug(s, 'energia', 'usb').ok).toBe(false);
    const one = ok(tryPlug(s, 'rede', 'rede'));
    expect(tryPlug(one, 'rede', 'rede').ok).toBe(false);
    expect(missingCables(one)).toEqual(['energia']);
    expect(missingCables(wired())).toEqual([]);
  });

  it('só liga (e fica on-line) depois de confirmar com os dois cabos', () => {
    const r0 = tryConfirm(newPrinterState());
    expect(r0.ok).toBe(false);
    if (!r0.ok) expect(r0.reason).toBe('Ainda falta ligar o cabo de rede e o cabo de energia na impressora.');
    const s = wired();
    expect(s.on).toBe(false);
    const r1 = tryConfirm(s);
    expect(r1.ok && r1.state.on).toBe(true);
  });

  it('imprime só com a impressora on-line e exatamente 10 cópias', () => {
    const offline = tryPrint(wired(), COPIES);
    expect(offline.ok).toBe(false);
    if (!offline.ok) expect(offline.reason).toContain('off-line');
    const on = ok(tryConfirm(wired()));
    expect(tryPrint(on, 1).ok).toBe(false);
    expect(tryPrint(on, 11).ok).toBe(false);
    expect(tryPrint(on, null).ok).toBe(false);
    const done = ok(tryPrint(on, COPIES));
    expect(done.printed).toBe(true);
    expect(tryPrint(done, COPIES).ok).toBe(false);
  });

  it('o campo Cópias aceita só números inteiros de 1 a 999', () => {
    expect(parseCopies('10')).toBe(10);
    expect(parseCopies(' 7 ')).toBe(7);
    for (const bad of ['', '0', '-1', '2.5', 'dez', '1000']) expect(parseCopies(bad), bad).toBe(null);
  });

  it('as entradas e as pontas da cena ficam dentro do desenho e longe umas das outras', () => {
    const geo = cena as unknown as { w: number; h: number; ports: Record<string, number[]>; plugs: Record<string, number[]> };
    for (const [x, y] of [...Object.values(geo.ports), ...Object.values(geo.plugs)]) {
      expect(x > 0 && x < geo.w && y > 0 && y < geo.h).toBe(true);
    }
    expect(Object.keys(geo.ports).sort()).toEqual(Object.keys(PORTS).sort());
    expect(Object.keys(geo.plugs).sort()).toEqual(Object.keys(PLUGS).sort());
    const ports = Object.values(geo.ports);
    ports.forEach(([ax, ay], i) => ports.slice(i + 1).forEach(([bx, by]) => expect(Math.hypot(ax - bx, ay - by)).toBeGreaterThan(10)));
  });
});
