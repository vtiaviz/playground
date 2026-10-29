import { describe, expect, it } from 'vitest';
import cena from '../src/assets/projetor/cena.json';
import { findPath, isFree, MEETING_BOSS, OBJECTS, PROJECTOR_BOX, roomAt } from '../src/game/map';
import {
  focusBlur,
  focusOk,
  isReady,
  missingForPower,
  newSetupState,
  PLUGS,
  PORTS,
  tryPlace,
  tryPlug,
  tryPowerOn,
  type ItemId,
  type PlugId,
  type PortId,
  type SetupState,
} from '../src/mission/projetor';

const overlaps = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Aplica uma tentativa que tem que dar certo. */
const ok = (r: ReturnType<typeof tryPlace>): SetupState => {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};
const placeAll = (s: SetupState) =>
  (
    [
      ['projetor', 'projetor'],
      ['vga', 'mesa'],
      ['forca', 'mesa'],
      ['webcam', 'webcam'],
    ] as const
  ).reduce((acc, [item, at]) => ok(tryPlace(acc, item as ItemId, at)), s);
const RIGHT: [PlugId, PortId][] = [
  ['vga-a', 'nb-vga'],
  ['vga-b', 'pj-vga'],
  ['forca-conector', 'pj-power'],
  ['forca-plugue', 'tomada'],
  ['webcam-usb', 'nb-usb'],
];

describe('fase 4, missão 1: o projetor e a webcam da vídeo chamada', () => {
  it('a caixa fica na Sala de Reuniões, sem bater em móvel, e dá para chegar na frente dela', () => {
    const { at, foot, zone } = PROJECTOR_BOX;
    expect(roomAt(at.x + 24, foot.y + foot.h)?.id).toBe('reunioes');
    for (const o of OBJECTS) expect(overlaps(foot, o), o.label).toBe(false);
    const front = { x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 };
    expect(isFree(front.x, front.y)).toBe(true);
    expect(findPath(MEETING_BOSS, front).length).toBeGreaterThan(0);
  });

  it('o projetor e a webcam só ficam no lugar marcado; os cabos, em qualquer ponto da mesa', () => {
    const s = newSetupState(() => 0.5);
    expect(tryPlace(s, 'projetor', 'mesa').ok).toBe(false);
    expect(tryPlace(s, 'webcam', 'projetor').ok).toBe(false);
    expect(tryPlace(s, 'vga', null).ok).toBe(false);
    expect(tryPlace(s, 'vga', 'webcam').ok).toBe(true);
    expect(placeAll(s).placed).toHaveLength(4);
  });

  it('cada ponta só encaixa na entrada do mesmo formato (VGA no HDMI não serve)', () => {
    const s = placeAll(newSetupState(() => 0.5));
    const hdmi = tryPlug(s, 'vga-a', 'nb-hdmi');
    expect(hdmi.ok).toBe(false);
    if (!hdmi.ok) expect(hdmi.reason).toContain('HDMI');
    expect(tryPlug(s, 'forca-plugue', 'pj-power').ok).toBe(false);
    expect(tryPlug(s, 'forca-conector', 'tomada').ok).toBe(false);
    expect(tryPlug(s, 'webcam-usb', 'nb-vga').ok).toBe(false);
    const one = ok(tryPlug(s, 'vga-a', 'nb-vga'));
    const busy = tryPlug(one, 'vga-b', 'nb-vga');
    expect(busy.ok).toBe(false);
    // as duas pontas do VGA são iguais: qualquer uma vai no notebook ou no projetor
    expect(tryPlug(s, 'vga-b', 'nb-vga').ok).toBe(true);
    // toda ponta tem uma entrada certa
    for (const [plug, port] of RIGHT) expect(PLUGS[plug].kind).toBe(PORTS[port].kind);
  });

  it('só liga com tudo na mesa e ligado; depois falta o driver, o foco e o teste da câmera', () => {
    let s = newSetupState(() => 0.5);
    const r0 = tryPowerOn(s);
    expect(r0.ok).toBe(false);
    if (!r0.ok) expect(r0.reason).toContain('tirar o projetor da caixa');
    s = placeAll(s);
    expect(missingForPower(s)).toEqual([
      'ligar o cabo VGA no notebook',
      'ligar o cabo VGA no projetor',
      'ligar o cabo de força no projetor',
      'ligar o cabo de força na tomada',
      'ligar o cabo USB da webcam no notebook',
    ]);
    s = RIGHT.reduce((acc, [plug, port]) => ok(tryPlug(acc, plug, port)), s);
    expect(missingForPower(s)).toEqual([]);
    s = ok(tryPowerOn(s));
    expect(s.on).toBe(true);
    expect(isReady(s)).toBe(false);
    s = { ...s, driver: true, camera: true };
    expect(focusOk(s)).toBe(false);
    expect(focusBlur(s)).toBeGreaterThan(0);
    s = { ...s, focus: s.focusTarget + 3 };
    expect(focusOk(s)).toBe(true);
    expect(focusBlur(s)).toBe(0);
    expect(isReady(s)).toBe(true);
  });

  it('o foco começa longe do ponto certo', () => {
    for (const r of [0, 0.3, 0.6, 0.99]) {
      const s = newSetupState(() => r);
      expect(Math.abs(s.focus - s.focusTarget)).toBeGreaterThan(20);
    }
  });

  it('as entradas e as pontas da cena ficam dentro do desenho, e o projetor tem as entradas em cima dele', () => {
    const geo = cena as unknown as {
      w: number;
      h: number;
      slots: Record<string, number[]>;
      ports: Record<string, number[]>;
      plugs: Record<string, number[]>;
    };
    for (const [x, y] of [...Object.values(geo.ports), ...Object.values(geo.plugs)]) {
      expect(x > 0 && x < geo.w && y > 0 && y < geo.h).toBe(true);
    }
    expect(Object.keys(geo.ports).sort()).toEqual(Object.keys(PORTS).sort());
    expect(Object.keys(geo.plugs).sort()).toEqual(Object.keys(PLUGS).sort());
    const [px, py, pw, ph] = geo.slots.projetor;
    for (const p of ['pj-vga', 'pj-hdmi', 'pj-power']) {
      const [x, y] = geo.ports[p];
      expect(x >= px && x <= px + pw && y >= py && y <= py + ph, p).toBe(true);
    }
  });
});
