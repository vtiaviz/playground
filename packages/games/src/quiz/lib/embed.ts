// embed.ts — altura sugerida para o iframe. É uma estimativa calibrada com medições feitas num
// navegador de verdade em tela estreita (360 px), que é o pior caso: em telas largas o jogo
// ocupa menos altura, e então só sobra um pouco de espaço no fim.
import { splitBlocks, type Question } from './quiz';

const MIN_HEIGHT = 560;
const MAX_HEIGHT = 1400; // acima disso o iframe rola por dentro

// caracteres por linha (aprox.) em 360 px de largura
const QUESTION_CHARS = 26;
const OPTION_CHARS = 24;
const REVIEW_Q_CHARS = 24;
const REVIEW_A_CHARS = 28;

const lines = (text: string, perLine: number) =>
  text.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / perLine)), 0);

// Primeira linha útil do enunciado (a mesma que a revisão do resultado mostra)
function firstLine(text: string, max = 90): string {
  const line = text.split('\n').find((l) => l.trim() !== '' && !l.trim().startsWith('```')) ?? text;
  const t = line.trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

// Tela de uma pergunta já respondida (a mais alta: tem faixa de feedback e botão)
export function questionHeight(q: Question): number {
  let h = 217; // margens, título, topo, progresso e acabamento do cartão

  for (const b of splitBlocks(q.text)) {
    h += b.kind === 'code' ? 36 + 26 * b.text.split('\n').length : 26 * lines(b.text, QUESTION_CHARS);
  }
  h += q.options.reduce((s, o) => s + Math.max(48, 22.4 * lines(o, OPTION_CHARS) + 26), 0);
  h += 10 * (q.options.length - 1);

  return h + 61 + 64; // faixa de feedback + botão "Próxima questão"
}

// Tela de resultado: cabeçalho + revisão de cada questão (supondo o pior caso: todas erradas)
export function resultsHeight(questions: Question[]): number {
  const review = questions.reduce((sum, q) => {
    const longest = q.options.reduce((a, b) => (b.length > a.length ? b : a), '');
    return (
      sum +
      30 +
      22 * lines(firstLine(q.text), REVIEW_Q_CHARS) +
      21 * (lines(longest, REVIEW_A_CHARS) + lines(q.options[q.correct], REVIEW_A_CHARS)) +
      8
    );
  }, 0);
  return 420 + review + 80;
}

export function iframeHeight(questions: Question[]): number {
  const playing = Math.max(0, ...questions.map(questionHeight));
  const h = Math.max(playing, resultsHeight(questions));
  return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(h / 10) * 10));
}
