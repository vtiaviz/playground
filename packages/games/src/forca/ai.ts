import type { AiSpec } from '../ai/types';
import { arr, isObj, str, uniqueBy } from '../ai/util';
import { validateWord } from './lib/hangman';
import { WORD_COUNT, validateConfig, type GameConfig } from './config';

export const forcaAi: AiSpec<GameConfig> = {
  type: 'FORCA',
  shape: '{"theme":"dica geral curta","words":["palavra1","palavra2","..."]}',
  rules: [
    'Palavras e termos importantes do texto, em português, só com letras (acentos são permitidos; hífen e espaço também).',
    'Sem números, siglas com pontos ou símbolos. Entre 3 e 20 letras.',
    `Mande 8 palavras: o jogo usa as ${WORD_COUNT} primeiras válidas.`,
    '"theme" é o assunto comum às palavras, com até 60 caracteres, sem revelar nenhuma delas.',
  ],
  levels: {
    easy: 'Palavras comuns e curtas (4 a 7 letras), muito citadas no texto.',
    normal: 'Termos do assunto com 6 a 10 letras.',
    hard: 'Termos técnicos ou menos frequentes com 8 a 16 letras; podem ser compostos (com hífen ou espaço).',
  },
  toConfig(raw, { title }) {
    if (!isObj(raw)) return null;
    const valid = arr(raw.words)
      .map(str)
      .filter((w) => w && validateWord(w).ok);
    const words = uniqueBy(valid, (w) => w).slice(0, WORD_COUNT);
    if (words.length < WORD_COUNT) return null;
    return validateConfig({ title, theme: str(raw.theme).slice(0, 80), words });
  },
  answerKey: (c) => [`Tema: ${c.theme || '—'}`, ...c.words.map((w, i) => `${i + 1}. ${w}`)],
};
