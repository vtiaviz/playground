// Entrada SEM React: pode ser usada no servidor (`@playground/games/validate`) para validar o
// conteúdo de uma atividade e conferir a nota recebida, sem carregar nenhum componente.
import { maxScore as cacaMax, validateConfig as cacaValidate } from './cacapalavras/config';
import { maxScore as frasesMax, validateConfig as frasesValidate } from './completefrases/config';
import { maxScore as cruzMax, validateConfig as cruzValidate } from './cruzadas/config';
import { maxScore as forcaMax, validateConfig as forcaValidate } from './forca/config';
import { maxScore as quizMax, validateConfig as quizValidate } from './quiz/config';
import { GAME_TYPES, type GameType } from './types';

export const isGameType = (x: unknown): x is GameType => (GAME_TYPES as readonly unknown[]).includes(x);

// Config válida e normalizada, ou null
export function validateGameConfig(type: GameType, raw: unknown): unknown | null {
  switch (type) {
    case 'CRUZADAS':
      return cruzValidate(raw);
    case 'FORCA':
      return forcaValidate(raw);
    case 'CACA_PALAVRAS':
      return cacaValidate(raw);
    case 'QUIZ':
      return quizValidate(raw);
    case 'COMPLETE_FRASES':
      return frasesValidate(raw);
  }
}

// Pontuação máxima de um jogo com esta config, ou null se a config for inválida
export function maxScoreFor(type: GameType, raw: unknown): number | null {
  const c = validateGameConfig(type, raw);
  if (c === null) return null;
  switch (type) {
    case 'CRUZADAS':
      return cruzMax();
    case 'FORCA':
      return forcaMax(c as Parameters<typeof forcaMax>[0]);
    case 'CACA_PALAVRAS':
      return cacaMax(c as Parameters<typeof cacaMax>[0]);
    case 'QUIZ':
      return quizMax(c as Parameters<typeof quizMax>[0]);
    case 'COMPLETE_FRASES':
      return frasesMax(c as Parameters<typeof frasesMax>[0]);
  }
}
export { GAME_TYPES, type GameType } from './types';
