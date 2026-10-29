import type { AiSpec } from '../ai/types';
import { arr, isObj, str } from '../ai/util';
import { MAX_CLUE, MAX_ENTRIES, MAX_LETTERS, MIN_LETTERS, generateLayout, normalizeAnswer, type Entry } from './lib/crossword';
import { validateConfig, type GameConfig } from './config';

const MIN_PLACED = 3;

export const cruzadasAi: AiSpec<GameConfig> = {
  type: 'CRUZADAS',
  shape: '{"entries":[{"answer":"PALAVRA","clue":"dica que leva à palavra"}]}',
  rules: [
    '"answer" é UMA palavra só (sem espaço, hífen ou número), de 3 a 15 letras; acentos são removidos depois.',
    `"clue" tem no máximo ${MAX_CLUE} caracteres e NÃO pode conter a resposta.`,
    'Use palavras com letras em comum (vogais frequentes ajudam a cruzar).',
  ],
  levels: {
    easy: '8 palavras curtas com dicas diretas (definição simples tirada do texto).',
    normal: '11 palavras com dicas que pedem compreensão do conceito.',
    hard: '15 palavras, incluindo termos técnicos, com dicas indiretas (exemplos, consequências, contrastes).',
  },
  toConfig(raw, { title, seed }) {
    const entries: Entry[] = [];
    const seen = new Set<string>();
    for (const e of arr(isObj(raw) ? raw.entries : null)) {
      if (!isObj(e)) continue;
      const answer = normalizeAnswer(str(e.answer).replace(/[\s-]/g, ''));
      const clue = str(e.clue);
      if (!answer || answer.length < MIN_LETTERS || answer.length > MAX_LETTERS || seen.has(answer)) continue;
      if (!clue || clue.length > MAX_CLUE || normalizeAnswer(clue.replace(/[^\p{L}]/gu, ''))?.includes(answer)) continue;
      seen.add(answer);
      entries.push({ answer, clue });
    }
    // palavras que não cruzam com nenhuma outra ficam de fora da grade
    const { layout } = generateLayout(entries.slice(0, MAX_ENTRIES), { seed });
    if (layout.words.length < MIN_PLACED) return null;
    return validateConfig({ title, layout });
  },
  answerKey: (c) => c.layout.words.map((w) => `${w.number} ${w.dir === 'across' ? '→' : '↓'} ${w.answer} — ${w.clue}`),
};
