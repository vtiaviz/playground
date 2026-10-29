import { describe, expect, it } from 'vitest';
import { getGame } from '@playground/games';
import { BATHROOM_DOOR, findPath, isFree, MEETING_SEAT, roomAt, URINAL_SPOTS, URINAL_ZONE, WALL_WORDS } from '../src/game/map';
import { CACA_PALAVRAS_BANHEIRO_PADRAO, CACA_PALAVRAS_PADRAO, MISSAO_BANHEIRO } from '../src/mission/missoes';

const inside = (r: { x: number; y: number; w: number; h: number }, p: { x: number; y: number }) =>
  p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
const pathLength = (from: { x: number; y: number }, to: { x: number; y: number }) => {
  const pts = [from, ...findPath(from, to), to];
  return pts.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0);
};

describe('fase 3, missão 5: o aperto no banheiro', () => {
  it('os 3 mictórios ficam no Banheiro, com chão livre na frente, dentro da área de chegada', () => {
    expect(URINAL_SPOTS).toHaveLength(3);
    for (const p of URINAL_SPOTS) {
      expect(roomAt(p.x, p.y)?.id).toBe('banheiro');
      expect(isFree(p.x, p.y)).toBe(true);
      expect(inside(URINAL_ZONE, p)).toBe(true);
    }
    expect(roomAt(WALL_WORDS.x, WALL_WORDS.y + 40)?.id).toBe('banheiro');
    expect(roomAt(BATHROOM_DOOR.x, BATHROOM_DOOR.y)).toBeNull(); // corredor
    expect(isFree(BATHROOM_DOOR.x, BATHROOM_DOOR.y)).toBe(true);
  });

  it('saindo da Sala de Reuniões dá para chegar a tempo andando, mas não sobra muito', () => {
    const dist = pathLength(MEETING_SEAT.approach, URINAL_SPOTS[0]);
    const walking = dist / 150; // velocidade normal do ESTAGIÁRIO (px/s)
    expect(walking).toBeLessThan(MISSAO_BANHEIRO.tempo * 0.85);
    expect(walking).toBeGreaterThan(MISSAO_BANHEIRO.tempo * 0.4);
  });

  it('o caça-palavras de exemplo é válido, coloca todas as palavras e é diferente do da fase 2', () => {
    const module = getGame('CACA_PALAVRAS');
    const config = module.validateConfig(CACA_PALAVRAS_BANHEIRO_PADRAO.config);
    expect(config).not.toBeNull();
    const words = (CACA_PALAVRAS_BANHEIRO_PADRAO.config as { words: string[] }).words;
    expect(module.summarize?.(config!)).toBe(`${words.length} palavras`);
    expect(CACA_PALAVRAS_BANHEIRO_PADRAO.title).not.toBe(CACA_PALAVRAS_PADRAO.title);
    // as palavras rabiscadas na parede do banheiro estão no caça-palavras de exemplo
    for (const w of ['CPU', 'RAM', 'BIT', 'SSD', 'USB']) expect(words).toContain(w);
    expect(MISSAO_BANHEIRO.xp).toBe(100);
  });
});
