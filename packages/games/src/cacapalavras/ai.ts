import type { AiSpec, Level } from '../ai/types';
import { arr, isObj, str, uniqueBy } from '../ai/util';
import { generate } from './lib/generator';
import { validateConfig, type GameConfig } from './config';

const MIN_WORDS = 4;
const SETUP: Record<Level, { max: number; directions: GameConfig['directions'] }> = {
  easy: { max: 6, directions: 'simple' },
  normal: { max: 10, directions: 'all' },
  hard: { max: 15, directions: 'all' },
};

export const cacaPalavrasAi: AiSpec<GameConfig> = {
  type: 'CACA_PALAVRAS',
  shape: '{"words":["palavra1","palavra2","..."]}',
  rules: ['Uma palavra por item, sem espaços, hífens, números ou símbolos (acentos são permitidos).', 'Palavras importantes do texto, sem repetir.'],
  levels: {
    easy: '6 palavras curtas (3 a 8 letras) e conhecidas.',
    normal: '10 palavras de 4 a 12 letras.',
    hard: '15 palavras de 5 a 15 letras, incluindo termos técnicos.',
  },
  toConfig(raw, { title, level, seed }) {
    if (!isObj(raw)) return null;
    const { max, directions } = SETUP[level];
    const words = uniqueBy(
      arr(raw.words)
        .map(str)
        .filter((w) => /^\p{L}{3,15}$/u.test(w))
        .map((w) => w.toLocaleUpperCase('pt-BR')),
      (w) => w,
    ).slice(0, max);
    if (words.length < MIN_WORDS) return null;
    const config = validateConfig({ title, words, seed, directions });
    if (!config) return null;
    // o gerador descarta o que não cabe: mantém só as palavras que entraram na grade
    const placed = new Set(generate(config).placements.map((p) => p.display));
    return validateConfig({ ...config, words: config.words.filter((w) => placed.has(w)) });
  },
  answerKey: (c) => c.words.map((w, i) => `${i + 1}. ${w}`),
};
