import { describe, expect, it } from 'vitest';
import { deviceSpot, findPath, IT_SEAT, IT_WAIT, IT_ZONE, isFree, ROOMS, roomAt } from '../src/game/map';
import {
  checkSurvey,
  clearWrong,
  COMPUTER_TYPES,
  explainProblems,
  realCount,
  SURVEY_DEVICES,
  tally,
  taggedCount,
  tallyGroups,
  type Survey,
} from '../src/mission/levantamento';

const spotOf = (id: string) => {
  const d = SURVEY_DEVICES.find((x) => x.id === id)!;
  return deviceSpot(d.host, d.gadget, d.nth);
};

function freePointIn(z: { x: number; y: number; w: number; h: number }) {
  for (let y = z.y + 2; y < z.y + z.h; y += 4) for (let x = z.x + 2; x < z.x + z.w; x += 4) if (isFree(x, y)) return { x, y };
  return null;
}

const overlaps = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Tudo certo: traço e adesivo do tipo de cada equipamento. */
const perfect = (): Survey => Object.fromEntries(SURVEY_DEVICES.map((d) => [d.id, { mark: d.type, sticker: d.type }]));

describe('levantamento: os equipamentos no mapa', () => {
  it('tem os 6 tipos, espalhados por todos os setores', () => {
    const count = realCount();
    for (const t of COMPUTER_TYPES) expect(count[t.id], t.id).toBeGreaterThan(0);
    const rooms = new Set(SURVEY_DEVICES.map((d) => d.room));
    for (const r of ROOMS.filter((r) => r.id !== 'entrada')) expect(rooms.has(r.id), r.id).toBe(true);
    expect(new Set(SURVEY_DEVICES.map((d) => d.id)).size).toBe(SURVEY_DEVICES.length);
  });

  it('cada equipamento está na sala certa e dá para chegar na frente dele', () => {
    for (const d of SURVEY_DEVICES) {
      const spot = spotOf(d.id);
      const p = freePointIn(spot.zone);
      expect(p, d.id).not.toBeNull();
      expect(roomAt(p!.x, p!.y)?.id, d.id).toBe(d.room);
      expect(findPath(IT_WAIT, p!).length, d.id).toBeGreaterThan(1);
    }
  });

  it('as áreas de dois equipamentos não se encostam (um de cada vez)', () => {
    const zones = SURVEY_DEVICES.map((d) => ({ id: d.id, z: spotOf(d.id).zone }));
    for (let i = 0; i < zones.length; i++)
      for (let j = i + 1; j < zones.length; j++) expect(overlaps(zones[i].z, zones[j].z), `${zones[i].id} × ${zones[j].id}`).toBe(false);
    for (const { id, z } of zones) expect(overlaps(z, IT_ZONE), id).toBe(false);
  });

  it('o encarregado da TI espera na Sala de TI, num lugar livre', () => {
    expect(roomAt(IT_WAIT.x, IT_WAIT.y)?.id).toBe('ti');
    expect(isFree(IT_WAIT.x, IT_WAIT.y)).toBe(true);
    expect(findPath(IT_SEAT, IT_WAIT).length).toBeGreaterThan(1);
    expect(freePointIn(IT_ZONE)).not.toBeNull();
  });
});

describe('levantamento: prancheta e conferência', () => {
  it('conta os traços por tipo e os equipamentos prontos (traço + adesivo)', () => {
    const s: Survey = {
      'estacao-1': { mark: 'desktop', sticker: 'desktop' },
      'estacao-2': { mark: 'desktop', sticker: null },
      'copa-tablet': { mark: 'smartphone', sticker: 'tablet' },
    };
    expect(tally(s).desktop).toBe(2);
    expect(tally(s).smartphone).toBe(1);
    expect(tally(s).tablet).toBe(0);
    expect(taggedCount(s)).toBe(2);
  });

  it('tudo certo → nenhum problema', () => {
    expect(checkSurvey(perfect())).toEqual([]);
    expect(tally(perfect())).toEqual(realCount());
  });

  it('acha não encontrados, adesivo trocado, traço errado e coisas pela metade', () => {
    const s = perfect();
    delete s.mainframe;
    s['copa-tablet'] = { mark: 'tablet', sticker: 'smartphone' };
    s['estacao-2'] = { mark: 'notebook', sticker: 'desktop' };
    s['servidor-1'] = { mark: 'servidor', sticker: null };
    const kinds = checkSurvey(s).map((p) => `${p.device.id}:${p.kind}`);
    expect(kinds).toEqual(
      expect.arrayContaining(['mainframe:missing', 'copa-tablet:wrongSticker', 'estacao-2:wrongMark', 'servidor-1:noSticker']),
    );
    expect(kinds).toHaveLength(4);
  });

  it('o encarregado explica cada erro e diz onde procurar o que faltou', () => {
    const s = perfect();
    delete s['impressao-celular'];
    delete s['copa-celular'];
    s['estacao-2'] = { mark: 'notebook', sticker: 'notebook' };
    const lines = explainProblems(checkSurvey(s));
    expect(lines[0]).toBe('Faltou achar 2 smartphones. Dica: procure na Impressão e Almoxarifado e na Copa.');
    expect(lines[1]).toMatch(/^Na mesa do Bruno: /);
    expect(lines[1]).toContain('você marcou Notebook na prancheta e colou o adesivo de Notebook');
    expect(lines[1]).toContain('É Desktop');
    expect(lines).toHaveLength(2);
  });

  it('depois da bronca, só os equipamentos errados voltam a ficar sem traço e sem adesivo', () => {
    const s = perfect();
    s['copa-tablet'] = { mark: 'tablet', sticker: 'smartphone' };
    delete s.mainframe;
    const next = clearWrong(s, checkSurvey(s));
    expect(next['copa-tablet']).toBeUndefined();
    expect(next['estacao-1']).toEqual({ mark: 'desktop', sticker: 'desktop' });
    expect(checkSurvey(next).map((p) => p.kind)).toEqual(['missing', 'missing']);
  });

  it('agrupa os traços de 5 em 5', () => {
    expect(tallyGroups(0)).toEqual([]);
    expect(tallyGroups(4)).toEqual([4]);
    expect(tallyGroups(11)).toEqual([5, 5, 1]);
  });
});
