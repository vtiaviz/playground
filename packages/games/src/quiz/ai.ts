import type { AiSpec } from '../ai/types';
import { arr, isObj, shuffle, str } from '../ai/util';
import { LETTERS, MAX_QUESTIONS, isValidQuestion, type Question } from './lib/quiz';
import { validateConfig, type GameConfig } from './config';

const MIN_QUESTIONS = 3;

// "correct" pode vir como índice (0 ou 1-based é ambíguo, então só 0-based), letra ("b") ou o texto da alternativa
function correctIndex(raw: unknown, options: string[]): number {
  if (typeof raw === 'number' && Number.isInteger(raw)) return raw;
  const s = str(raw);
  if (/^[a-f]$/i.test(s)) return LETTERS.indexOf(s.toUpperCase());
  return options.findIndex((o) => o.toLowerCase() === s.toLowerCase());
}

export const quizAi: AiSpec<GameConfig> = {
  type: 'QUIZ',
  shape: '{"questions":[{"text":"enunciado","options":["alternativa 1","alternativa 2","..."],"correct":0,"explanation":"por que está certa"}]}',
  rules: [
    '"correct" é o índice (começando em 0) da alternativa certa em "options".',
    'Só uma alternativa correta por pergunta; as erradas devem ser plausíveis, do mesmo assunto e de tamanho parecido.',
    'Não use "todas as anteriores" nem "nenhuma das anteriores".',
    'Enunciado com no máximo 300 caracteres e alternativas com no máximo 150.',
  ],
  levels: {
    easy: '5 perguntas com 3 alternativas cada. Fatos e definições que aparecem explicitamente no texto.',
    normal: '8 perguntas com 4 alternativas cada. Compreensão: relacionar conceitos, identificar exemplos.',
    hard: '10 perguntas com 5 alternativas cada. Aplicação e análise: situações práticas, comparação entre conceitos parecidos, distratores muito próximos da resposta.',
  },
  toConfig(raw, { title, seed }) {
    const questions: Question[] = [];
    for (const [i, q] of arr(isObj(raw) ? raw.questions : null).entries()) {
      if (!isObj(q)) continue;
      const options = arr(q.options).map(str).filter(Boolean);
      const correct = correctIndex(q.correct, options);
      if (correct < 0 || correct >= options.length || new Set(options).size !== options.length) continue;
      // o modelo tende a pôr a certa sempre na mesma posição: embaralha
      const order = shuffle(options.map((_, k) => k), seed + i);
      const candidate = { text: str(q.text), options: order.map((k) => options[k]), correct: order.indexOf(correct) };
      if (isValidQuestion(candidate)) questions.push(candidate);
    }
    if (questions.length < MIN_QUESTIONS) return null;
    return validateConfig({ title, questions: questions.slice(0, MAX_QUESTIONS) });
  },
  answerKey: (c) => c.questions.map((q, i) => `${i + 1}. ${q.text} → ${LETTERS[q.correct]}) ${q.options[q.correct]}`),
};
