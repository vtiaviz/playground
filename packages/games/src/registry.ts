import { cacaPalavras } from './cacapalavras';
import { completeFrases } from './completefrases';
import { cruzadas } from './cruzadas';
import { forca } from './forca';
import { quiz } from './quiz';
import type { GameModule, GameType } from './types';

// Cada módulo tem um tipo de config diferente; quem usa o registro por `GameType` trata a config
// como `unknown` e valida com `validateConfig` antes de usar.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGameModule = GameModule<any>;

export const GAMES: Record<GameType, AnyGameModule> = {
  CRUZADAS: cruzadas,
  FORCA: forca,
  CACA_PALAVRAS: cacaPalavras,
  QUIZ: quiz,
  COMPLETE_FRASES: completeFrases,
};

export const listGames = (): AnyGameModule[] => Object.values(GAMES);

export const getGame = (type: GameType): AnyGameModule => GAMES[type];
