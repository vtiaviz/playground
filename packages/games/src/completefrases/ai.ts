import type { AiSpec } from '../ai/types';
import { arr, isObj, str } from '../ai/util';
import { MAX_DECOYS, MAX_EXPLANATION_LEN, parseDecoys, parseSentences, sentenceText, type Sentence } from './lib/sentences';
import { validateConfig, type GameConfig } from './config';

const MIN_SENTENCES = 3;

export const completeFrasesAi: AiSpec<GameConfig> = {
  type: 'COMPLETE_FRASES',
  shape: '{"sentences":[{"text":"Frase com a palavra certa entre [colchetes].","explanation":"explicação curta"}],"decoys":["palavra errada"]}',
  rules: [
    'Cada frase é uma afirmação correta tirada do texto, com até 300 caracteres.',
    'A palavra (ou expressão curta, até 3 palavras) que o aluno deve completar vai entre colchetes.',
    'A resposta precisa ser a única que faz sentido na frase.',
    `"explanation" tem até ${MAX_EXPLANATION_LEN} caracteres.`,
    '"decoys" são palavras erradas, mas do mesmo assunto, que não podem ser iguais a nenhuma resposta.',
  ],
  levels: {
    easy: '5 frases com 1 lacuna cada e nenhuma palavra extra ("decoys": []). Palavras-chave óbvias.',
    normal: '7 frases com 1 ou 2 lacunas e 3 palavras extras.',
    hard: '10 frases, várias com 2 lacunas, e 6 palavras extras muito parecidas com as respostas.',
  },
  toConfig(raw, { title }) {
    if (!isObj(raw)) return null;
    const sentences: Sentence[] = [];
    for (const s of arr(raw.sentences)) {
      const text = isObj(s) ? str(s.text) : str(s);
      // reaproveita o leitor do editor: frase por frase, para uma ruim não derrubar as outras
      const parsed = parseSentences(text).sentences[0];
      if (!parsed || sentences.some((x) => sentenceText(x) === sentenceText(parsed))) continue;
      sentences.push({ ...parsed, explanation: isObj(s) ? str(s.explanation).slice(0, MAX_EXPLANATION_LEN) : '' });
    }
    if (sentences.length < MIN_SENTENCES) return null;
    const decoys = parseDecoys(arr(raw.decoys).map(str).join('\n'), sentences).decoys.slice(0, MAX_DECOYS);
    return validateConfig({ title, sentences, decoys });
  },
  answerKey: (c) => [
    ...c.sentences.map((s, i) => `${i + 1}. ${s.answers.join(' · ')}`),
    ...(c.decoys.length ? [`Palavras extras: ${c.decoys.join(', ')}`] : []),
  ],
};
