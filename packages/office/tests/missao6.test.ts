import { describe, expect, it } from 'vitest';
import {
  ALARM_PANEL,
  ALARM_ZONE,
  CEO_SEAT,
  deskSpot,
  EXIT_INSIDE,
  EXIT_OUTSIDE,
  findPath,
  isFree,
  RH_HOME,
  roomAt,
  WORKSTATIONS,
} from '../src/game/map';
import { summarize } from '../src/mission/DaySummary';
import { afterAction, describeOn, newPowerStates, OFFICE_PCS, OS_NAMES, stillOn } from '../src/mission/desligar';

const ROOM_OF: Record<string, string> = { ana: 'trabalho', carla: 'trabalho', elisa: 'trabalho', rh: 'rh', financeiro: 'financeiro', ti: 'ti' };

/** Algum ponto livre dentro da área (onde os pés do ESTAGIÁRIO podem ficar). */
function freePointIn(z: { x: number; y: number; w: number; h: number }) {
  for (let y = z.y + 2; y < z.y + z.h; y += 4) for (let x = z.x + 2; x < z.x + z.w; x += 4) if (isFree(x, y)) return { x, y };
  return null;
}

describe('missão 6: computadores ligados no fim do dia', () => {
  it('são 6, um de cada sistema', () => {
    expect(OFFICE_PCS).toHaveLength(6);
    expect(new Set(OFFICE_PCS.map((pc) => pc.os)).size).toBe(6);
    expect(Object.keys(OS_NAMES)).toHaveLength(6);
  });

  it('cada um fica na sala certa e dá para chegar na frente dele', () => {
    for (const pc of OFFICE_PCS) {
      const spot = deskSpot(pc.desk);
      const p = freePointIn(spot.zone);
      expect(p, pc.id).not.toBeNull();
      expect(roomAt(p!.x, p!.y)?.id, pc.id).toBe(ROOM_OF[pc.id]);
    }
  });

  it('o painel do alarme fica na Recepção, perto da porta, e dá para chegar nele', () => {
    expect(roomAt(ALARM_PANEL.x, ALARM_PANEL.y + ALARM_PANEL.h)?.id).toBe('recepcao');
    expect(freePointIn(ALARM_ZONE)).not.toBeNull();
    expect(Math.abs(ALARM_PANEL.x - EXIT_INSIDE.x)).toBeLessThan(4 * 32);
  });

  it('todos conseguem andar até a porta (colegas, Rita e CEO) e a saída dá na calçada', () => {
    for (const from of [...WORKSTATIONS.map((w) => w.seat), RH_HOME, CEO_SEAT]) {
      expect(findPath(from, EXIT_INSIDE).length).toBeGreaterThan(1);
    }
    expect(roomAt(EXIT_INSIDE.x, EXIT_INSIDE.y)?.id).toBe('recepcao');
    expect(roomAt(EXIT_OUTSIDE.x, EXIT_OUTSIDE.y)?.id).toBe('entrada');
  });
});

describe('missão 6: desligar de verdade', () => {
  it('só "Desligar" desliga; reiniciar volta ligado; suspender e sair continuam ligados', () => {
    expect(afterAction('shutdown')).toBe('off');
    expect(afterAction('restart')).toBe('on');
    expect(afterAction('sleep')).toBe('sleep');
    expect(afterAction('logoff')).toBe('login');
    expect(afterAction('lock')).toBe('login');
  });

  it('suspenso e tela de entrada contam como ligados para o alarme', () => {
    const st = newPowerStates();
    for (const pc of OFFICE_PCS) st[pc.id] = 'off';
    expect(stillOn(st)).toHaveLength(0);
    st.ti = 'sleep';
    st.rh = 'login';
    expect(stillOn(st).map((pc) => pc.id)).toEqual(['rh', 'ti']);
    expect(describeOn(OFFICE_PCS[5], 'sleep')).toContain('Suspender não desliga');
  });
});

describe('fim da fase 1: resumo do dia', () => {
  it('soma ganhos e perdas por missão e dá estrelas pelas broncas', () => {
    const r = summarize([
      { mission: 'a', title: 'A', xp: 100 },
      { mission: 'b', title: 'B', xp: -100, note: 'bronca' },
      { mission: 'b', title: 'B', xp: 100 },
    ]);
    expect(r.rows).toEqual([
      { mission: 'a', title: 'A', gained: 100, lost: 0, notes: [] },
      { mission: 'b', title: 'B', gained: 100, lost: 100, notes: ['bronca'] },
    ]);
    expect(r.stars).toBe(2);
    expect(summarize([{ mission: 'a', title: 'A', xp: 100 }]).stars).toBe(3);
  });
});
