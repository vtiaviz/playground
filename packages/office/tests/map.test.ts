import { describe, expect, it } from 'vitest';
import { CEO_TALK_ZONE, FURNITURE, isFree, MAP_SIZE, ROOMS, roomAt, SPAWN, TILE } from '../src/game/map';

// Busca em largura numa grade de 4 px: de onde o ESTAGIÁRIO consegue chegar andando a partir do início.
function reachable(doorOpen: boolean, step = 4) {
  const cols = Math.ceil(MAP_SIZE.width / step);
  const rows = Math.ceil(MAP_SIZE.height / step);
  const seen = new Uint8Array(cols * rows);
  const sx = Math.round(SPAWN.x / step);
  const sy = Math.round(SPAWN.y / step);
  const queue = [sy * cols + sx];
  seen[queue[0]] = 1;
  while (queue.length) {
    const cur = queue.pop()!;
    const cx = cur % cols;
    const cy = (cur - cx) / cols;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const i = ny * cols + nx;
      if (seen[i] || !isFree(nx * step, ny * step, doorOpen)) continue;
      seen[i] = 1;
      queue.push(i);
    }
  }
  return (x: number, y: number) => seen[Math.round(y / step) * cols + Math.round(x / step)] === 1;
}

describe('mapa do escritório', () => {
  const canReach = reachable(true);
  const canReachClosed = reachable(false);

  it('o personagem começa num lugar livre', () => {
    expect(isFree(SPAWN.x, SPAWN.y)).toBe(true);
  });

  it.each(ROOMS.map((r) => [r.name, r] as const))('dá para entrar em %s andando', (_name, room) => {
    expect(isFree(room.anchor.x, room.anchor.y)).toBe(true);
    expect(roomAt(room.anchor.x, room.anchor.y)?.id).toBe(room.id);
    expect(canReach(room.anchor.x, room.anchor.y)).toBe(true);
  });

  it('começa do lado de fora: com a porta de vidro fechada não dá para entrar', () => {
    expect(roomAt(SPAWN.x, SPAWN.y)?.id).toBe('entrada');
    expect(canReachClosed(17 * TILE, 27 * TILE)).toBe(false);
    expect(canReach(17 * TILE, 27 * TILE)).toBe(true);
  });

  it('não dá para ir para a rua nem atravessar paredes', () => {
    expect(canReach(23 * TILE, 34 * TILE)).toBe(false); // rua
    expect(isFree(14.5 * TILE, 5 * TILE)).toBe(false); // divisória diretoria / reuniões
    expect(isFree(10, 15 * TILE)).toBe(false); // parede esquerda
  });

  it('fora das salas é corredor', () => {
    expect(roomAt(20 * TILE, 10.5 * TILE)).toBeNull();
  });

  it('dá para chegar perto do CEO (área em que ele puxa conversa)', () => {
    let found = false;
    for (let y = CEO_TALK_ZONE.y; y < CEO_TALK_ZONE.y + CEO_TALK_ZONE.h && !found; y += 4) {
      for (let x = CEO_TALK_ZONE.x; x < CEO_TALK_ZONE.x + CEO_TALK_ZONE.w && !found; x += 4) {
        found = isFree(x, y, true) && canReach(x, y);
      }
    }
    expect(found).toBe(true);
  });

  it('todos os móveis ficam dentro do mapa', () => {
    for (const f of FURNITURE) {
      expect(f.x >= 0 && f.y >= 0 && f.x + f.w <= MAP_SIZE.width && f.y + f.h <= MAP_SIZE.height, f.label).toBe(true);
    }
  });
});
