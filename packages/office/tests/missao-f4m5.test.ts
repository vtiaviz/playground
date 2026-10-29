import { describe, expect, it } from 'vitest';
import { getGame } from '@playground/games';
import { findPath, FURNITURE, isFree, RH_WAIT, RITA_ANNOUNCE, roomAt, TRAINING_ZONE, WORDSEARCH_PAPER } from '../src/game/map';
import {
  CACA_PALAVRAS_BANHEIRO_PADRAO,
  CACA_PALAVRAS_PADRAO,
  CACA_PALAVRAS_TREINAMENTO_PADRAO,
  FIM_DIA4,
  MISSAO_CACA_TREINAMENTO,
} from '../src/mission/missoes';

describe('fase 4, missão 5: o caça-palavras do treinamento e o fim do 4º dia', () => {
  it('o caça-palavras de exemplo é válido, coloca todas as palavras e é diferente dos outros', () => {
    const module = getGame('CACA_PALAVRAS');
    const config = module.validateConfig(CACA_PALAVRAS_TREINAMENTO_PADRAO.config);
    expect(config).not.toBeNull();
    const words = (CACA_PALAVRAS_TREINAMENTO_PADRAO.config as { words: string[] }).words;
    expect(module.summarize?.(config!)).toBe(`${words.length} palavras`);
    expect([CACA_PALAVRAS_PADRAO.title, CACA_PALAVRAS_BANHEIRO_PADRAO.title]).not.toContain(CACA_PALAVRAS_TREINAMENTO_PADRAO.title);
    expect(MISSAO_CACA_TREINAMENTO.xp).toBe(100);
    expect(MISSAO_CACA_TREINAMENTO.wow).toContain('AINDA TEM MAIS UMA');
  });

  it('a terceira folha fica em cima da mesa do Marcos', () => {
    const desk = FURNITURE.find((f) => f.label === 'Mesa da TI')!;
    expect(WORDSEARCH_PAPER.x).toBeGreaterThanOrEqual(desk.x);
    expect(WORDSEARCH_PAPER.x + 26).toBeLessThanOrEqual(desk.x + desk.w);
    expect(WORDSEARCH_PAPER.y).toBeGreaterThanOrEqual(desk.y);
  });

  it('a Rita consegue ir do RH até a Área de Trabalho e de lá até a mesa do Marcos', () => {
    expect(roomAt(RITA_ANNOUNCE.x, RITA_ANNOUNCE.y)?.id).toBe('trabalho');
    expect(isFree(RITA_ANNOUNCE.x, RITA_ANNOUNCE.y)).toBe(true);
    expect(findPath(RH_WAIT, RITA_ANNOUNCE).length).toBeGreaterThan(0);
    const front = { x: TRAINING_ZONE.x + TRAINING_ZONE.w / 2, y: TRAINING_ZONE.y + TRAINING_ZONE.h / 2 };
    expect(findPath(RITA_ANNOUNCE, front).length).toBeGreaterThan(0);
    expect(FIM_DIA4.rita).toHaveLength(2);
  });
});
