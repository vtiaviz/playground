import { describe, expect, it } from 'vitest';
import bancada from '../src/assets/montar/bancada.json';
import { findPath, isFree, IT_WAIT, OBJECTS, PC_BOXES, roomAt } from '../src/game/map';
import {
  BUILDS,
  buildById,
  inBox,
  missingForBoot,
  newBuildState,
  PORTS,
  SLOTS_OF,
  tryBoot,
  tryCable,
  tryPlace,
  type Build,
  type BuildState,
  type PortId,
  type SlotId,
} from '../src/mission/montarPc';

/** Encaixa todas as peças na ordem da caixa (que já é a ordem certa). */
function placeAll(build: Build) {
  let s = newBuildState();
  for (const p of build.pieces) {
    const free = SLOTS_OF[p.kind].find((sl) => !s.installed[sl])!;
    const r = tryPlace(build, s, p.id, free);
    if (!r.ok) throw new Error(`${p.id}: ${r.reason}`);
    s = r.state;
  }
  return s;
}

function cable(s: BuildState, a: PortId, b: PortId) {
  const r = tryCable(s, a, b);
  if (!r.ok) throw new Error(`${a} → ${b}: ${r.reason}`);
  return r.state;
}

describe('fase 3, missão 3: os pedidos', () => {
  it('estudante i3 · 8 GB · HD; gamer i7 · 32 GB · SSD · placa de vídeo · 500 W; escritório i5 · 16 GB · SSD + HD', () => {
    const names = (id: Parameters<typeof buildById>[0]) => buildById(id).pieces.map((p) => p.name).join(' | ');
    expect(names('estudante')).toContain('Processador i3');
    expect(names('estudante')).toContain('HD 512 GB');
    expect(names('estudante')).not.toContain('SSD');
    expect(names('estudante')).not.toContain('Placa de vídeo');
    expect(names('gamer')).toMatch(/i7.*Memória 16 GB \| Memória 16 GB.*SSD 512 GB.*Placa de vídeo.*Fonte 500 W/);
    expect(names('gamer')).toContain('Gabinete gamer');
    expect(names('escritorio')).toMatch(/i5.*Memória 8 GB \| Memória 8 GB.*SSD 256 GB.*HD 512 GB/);
    for (const b of BUILDS) {
      expect(new Set(b.pieces.map((p) => p.id)).size, b.id).toBe(b.pieces.length);
      for (const k of ['gabinete', 'placa-mae', 'processador', 'cooler', 'ram', 'fonte'] as const)
        expect(b.pieces.some((p) => p.kind === k), `${b.id} sem ${k}`).toBe(true);
    }
  });

  it('cada lugar e cada porta da bancada está dentro da imagem', () => {
    const g = bancada as unknown as { w: number; h: number; slots: Record<SlotId, number[]>; ports: Record<PortId, number[]> };
    for (const [id, [x, y, w, h]] of Object.entries(g.slots)) expect(x >= 0 && y >= 0 && x + w <= g.w && y + h <= g.h, id).toBe(true);
    for (const id of Object.keys(PORTS)) expect(g.ports[id as PortId], id).toBeDefined();
  });
});

describe('fase 3, missão 3: encaixar as peças', () => {
  const b = buildById('gamer');

  it('peça no lugar errado volta com a dica, e o gabinete vem primeiro', () => {
    const s = newBuildState();
    const mb = tryPlace(b, s, 'gamer-mae', 'placa-mae');
    expect(mb).toEqual({ ok: false, reason: 'Primeiro coloque o gabinete na mesa.' });
    const s1 = (tryPlace(b, s, 'gamer-gabinete', 'gabinete') as { state: BuildState }).state;
    expect(tryPlace(b, s1, 'gamer-cpu', 'processador')).toMatchObject({ ok: false, reason: expect.stringContaining('placa-mãe') });
    const s2 = (tryPlace(b, s1, 'gamer-mae', 'placa-mae') as { state: BuildState }).state;
    expect(tryPlace(b, s2, 'gamer-cpu', 'fonte')).toMatchObject({ ok: false, reason: expect.stringContaining('soquete') });
    expect(tryPlace(b, s2, 'gamer-cooler', 'cooler')).toMatchObject({ ok: false, reason: expect.stringContaining('processador primeiro') });
    expect(tryPlace(b, s2, 'gamer-ssd', null)).toMatchObject({ ok: false, reason: expect.stringContaining('baia pequena') });
  });

  it('as duas memórias vão nos dois slots, mesmo soltas no mesmo', () => {
    let s = placeAll({ ...b, pieces: b.pieces.filter((p) => p.kind !== 'ram') });
    s = (tryPlace(b, s, 'gamer-ram-a', 'ram-0') as { state: BuildState }).state;
    const r = tryPlace(b, s, 'gamer-ram-b', 'ram-0');
    expect(r).toMatchObject({ ok: true, slot: 'ram-1' });
    expect(inBox(b, (r as { state: BuildState }).state)).toHaveLength(0);
  });
});

describe('fase 3, missão 3: cabos e ligar', () => {
  it('cabo de outro tipo, ou de entrada com entrada, não encaixa', () => {
    const s = placeAll(buildById('escritorio'));
    expect(tryCable(s, 'psu-sata-0', 'hd-data')).toMatchObject({ ok: false, reason: expect.stringContaining('Não encaixa') });
    expect(tryCable(s, 'hd-power', 'ssd-power')).toMatchObject({ ok: false });
    expect(tryCable(s, 'psu-pcie', 'mb-24')).toMatchObject({ ok: false });
    // sem placa de vídeo, a porta dela não aparece
    expect(tryCable(s, 'psu-pcie', 'gpu-power')).toEqual({ ok: false, reason: '' });
    const s1 = cable(s, 'hd-power', 'psu-sata-1');
    expect(s1.cables).toEqual([['psu-sata-1', 'hd-power']]);
    expect(tryCable(s1, 'psu-sata-1', 'ssd-power')).toMatchObject({ ok: false, reason: expect.stringContaining('já tem um cabo') });
  });

  it('só liga com todas as peças e todos os cabos; aí aparece a tela de inicialização', () => {
    const b = buildById('escritorio');
    expect(tryBoot(b, newBuildState())).toMatchObject({ ok: false, reason: expect.stringContaining('gabinete') });
    let s = placeAll(b);
    expect(missingForBoot(b, s)).toEqual([
      'ligar o cabo de energia da placa-mãe (24 pinos)',
      'ligar a energia do HD',
      'ligar o cabo de dados SATA do HD',
      'ligar a energia do SSD',
      'ligar o cabo de dados SATA do SSD',
    ]);
    s = cable(s, 'psu-24', 'mb-24');
    s = cable(s, 'psu-sata-0', 'hd-power');
    s = cable(s, 'mb-sata-0', 'hd-data');
    s = cable(s, 'psu-sata-1', 'ssd-power');
    const almost = tryBoot(b, s);
    expect(almost).toMatchObject({ ok: false, reason: 'O computador não ligou. Falta ligar o cabo de dados SATA do SSD.' });
    s = cable(s, 'ssd-data', 'mb-sata-1');
    expect(tryBoot(b, s)).toMatchObject({ ok: true, state: { booted: true } });
  });

  it('o gamer precisa da energia da placa de vídeo', () => {
    const b = buildById('gamer');
    let s = placeAll(b);
    s = cable(s, 'psu-24', 'mb-24');
    s = cable(s, 'psu-sata-0', 'ssd-power');
    s = cable(s, 'mb-sata-0', 'ssd-data');
    expect(missingForBoot(b, s)).toEqual(['ligar a energia da placa de vídeo']);
    s = cable(s, 'psu-pcie', 'gpu-power');
    expect(tryBoot(b, s).ok).toBe(true);
  });
});

describe('fase 3, missão 3: as caixas na Sala de TI', () => {
  it('ficam na Sala de TI, sem bater nos móveis, com a frente livre e caminho até ela', () => {
    for (const box of PC_BOXES) {
      expect(roomAt(box.foot.x, box.foot.y)?.id).toBe('ti');
      for (const o of OBJECTS)
        expect(
          box.foot.x < o.x + o.w && box.foot.x + box.foot.w > o.x && box.foot.y < o.y + o.h && box.foot.y + box.foot.h > o.y,
          `${o.label}`,
        ).toBe(false);
      const front = { x: box.zone.x + box.zone.w / 2, y: box.zone.y + box.zone.h / 2 };
      expect(isFree(front.x, front.y)).toBe(true);
      expect(findPath(IT_WAIT, front).length).toBeGreaterThan(0);
    }
  });
});
