// quiz.ts — leitor do formato de texto e utilitários do quiz (puro, sem React/DOM)
//
// Formato aceito (numeração e maiúsculas/minúsculas são tolerantes):
//
//   1 - Qual a principal função do HD?
//   a) Armazenar informações
//   b) Criar novas paginas web
//   resposta: a
//
// Código: `trecho em crases` (em qualquer lugar) ou um bloco entre linhas ``` no enunciado
// (o conteúdo do bloco é copiado como está, com a indentação, e não é lido como alternativa).

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;
export const MAX_QUESTIONS = 30;
export const MAX_QUESTION_CHARS = 800; // folga para enunciados com bloco de código
export const MAX_OPTION_CHARS = 200;
export const LETTERS = 'ABCDEF';

export interface Question {
  text: string;      // pode ter várias linhas e trechos `em crases`
  options: string[]; // 2 a 6 alternativas, na ordem digitada
  correct: number;   // índice da alternativa certa
}

export interface QuizError {
  line: number;     // 1-based; 0 = erro geral
  question: number; // nº da pergunta (1-based, pela ordem de aparição); 0 = geral
  message: string;
}

export interface ParseResult {
  questions: Question[];
  errors: QuizError[];
}

// "1 - texto", "1. texto", "1) texto", "1: texto", "Questão 1 - texto", "Pergunta 1: texto"
const QUESTION_START = /^(?:(?:quest[aã]o|pergunta)\s*)?(\d+)\s*[-–—.):]\s*(\S.*)$/iu;
// "a) texto" ou "a. texto" (com espaço depois do ponto, para não confundir com "e.g.")
const OPTION = /^([A-Fa-f])(?:\)\s*|\.\s+)(\S.*)$/u;
const OPTION_EMPTY = /^([A-Fa-f])\)\s*$/u;
// "resposta: b", "respota: b" (erro comum), "gabarito: b", "resposta correta - b", "resposta: B) texto"
const ANSWER =
  /^(?:respos?ta(?:\s+correta)?|gabarito|correta)\s*[:=\-–—]\s*\(?([A-Fa-f])(?![\p{L}\p{N}])/iu;
const ANSWER_KEYWORD = /^(?:respos?ta|gabarito|correta)\b/iu;

interface Draft {
  question: number;       // nº sequencial
  given: number;          // número escrito pelo autor
  line: number;
  textLines: string[];
  options: string[];
  closed: boolean;
  invalid: boolean;       // já houve erro nesta pergunta: não reportar mais nada sobre ela
}

export function parseQuiz(text: string): ParseResult {
  const questions: Question[] = [];
  const errors: QuizError[] = [];
  let cur = null as Draft | null; // (a asserção evita que o TS estreite para null: ele é atribuído dentro do forEach)
  let count = 0;
  let fence = false; // dentro de um bloco ``` do enunciado

  const err = (line: number, question: number, message: string) => errors.push({ line, question, message });

  // Valida a pergunta ao ler a linha de resposta
  const close = (block: Draft, letter: string, line: number) => {
    block.closed = true;
    if (block.invalid) return;

    const q = block.question;
    const qText = block.textLines.join('\n').trim();
    const idx = LETTERS.indexOf(letter.toUpperCase());

    if (qText === '') return err(block.line, q, `Pergunta ${q}: o enunciado está vazio.`);
    if (block.options.length < MIN_OPTIONS)
      return err(line, q, `Pergunta ${q} (linha ${block.line}): precisa de pelo menos ${MIN_OPTIONS} alternativas (a, b, ...).`);
    if (idx >= block.options.length)
      return err(line, q, `Pergunta ${q} (linha ${line}): a resposta "${letter.toUpperCase()}" não corresponde a nenhuma alternativa (há ${block.options.length}).`);
    if (qText.length > MAX_QUESTION_CHARS)
      return err(block.line, q, `Pergunta ${q} (linha ${block.line}): o enunciado passa de ${MAX_QUESTION_CHARS} caracteres.`);
    if (block.options.some((o) => o.length > MAX_OPTION_CHARS))
      return err(block.line, q, `Pergunta ${q} (linha ${block.line}): uma alternativa passa de ${MAX_OPTION_CHARS} caracteres.`);

    questions.push({ text: qText, options: block.options, correct: idx });
  };

  // Pergunta que chegou ao fim (ou a uma nova pergunta) sem linha de resposta
  const missingAnswer = (block: Draft) => {
    if (!block.closed && !block.invalid)
      err(block.line, block.question, `Pergunta ${block.question} (linha ${block.line}): falta a linha de resposta (ex.: resposta: a).`);
  };

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    const t = raw.trim();

    // bloco de código (```) no enunciado: o conteúdo vale como está, até a linha ``` de fechamento
    if (cur && !cur.closed && cur.options.length === 0 && (fence || t.startsWith('```'))) {
      if (t.startsWith('```')) {
        fence = !fence;
        cur.textLines.push(t);
      } else {
        cur.textLines.push(raw.replace(/\s+$/, ''));
      }
      return;
    }

    if (t === '') return;

    const answer = ANSWER.exec(t);
    if (answer) {
      if (cur && !cur.closed) close(cur, answer[1], line);
      else err(line, cur?.question ?? 0, `Linha ${line}: resposta sem uma pergunta aberta.`);
      return;
    }
    if (ANSWER_KEYWORD.test(t) && cur && !cur.closed) {
      err(line, cur.question, `Pergunta ${cur.question} (linha ${line}): linha de resposta inválida (use: resposta: a).`);
      cur.invalid = true;
      return;
    }

    const start = QUESTION_START.exec(t);
    const startsNew =
      start !== null && (!cur || cur.closed || Number(start[1]) === cur.given + 1);
    if (start && startsNew) {
      if (cur) missingAnswer(cur);
      count++;
      cur = { question: count, given: Number(start[1]), line, textLines: [start[2].trim()], options: [], closed: false, invalid: false };
      return;
    }

    if (!cur || cur.closed) {
      err(line, cur?.question ?? 0, `Linha ${line}: texto fora de uma pergunta (cada pergunta começa com um número, ex.: 1 - ...).`);
      return;
    }

    if (OPTION_EMPTY.test(t)) {
      if (!cur.invalid) err(line, cur.question, `Pergunta ${cur.question} (linha ${line}): a alternativa ${t[0].toUpperCase()}) está sem texto.`);
      cur.invalid = true;
      return;
    }

    const opt = OPTION.exec(t);
    if (opt) {
      const letter = opt[1].toUpperCase();
      const expected = LETTERS[cur.options.length];
      if (letter !== expected) {
        if (!cur.invalid)
          err(line, cur.question, `Pergunta ${cur.question} (linha ${line}): alternativa fora de ordem (esperava ${expected}), encontrei ${letter}).`);
        cur.invalid = true;
        return;
      }
      cur.options.push(opt[2].trim());
      return;
    }

    // continuação do enunciado (antes das alternativas) ou da última alternativa
    if (cur.options.length === 0) cur.textLines.push(t);
    else cur.options[cur.options.length - 1] += ' ' + t;
  });

  if (fence && cur) {
    err(cur.line, cur.question, `Pergunta ${cur.question} (linha ${cur.line}): bloco de código sem fechamento (falta a linha \`\`\`).`);
    cur.invalid = true;
  }
  if (cur) missingAnswer(cur);

  if (questions.length > MAX_QUESTIONS) {
    err(0, 0, `Máximo de ${MAX_QUESTIONS} perguntas: as demais foram ignoradas.`);
    questions.length = MAX_QUESTIONS;
  }
  return { questions, errors };
}

// Inverso de parseQuiz: texto editável de perguntas já prontas (para reabrir um jogo salvo)
export function formatQuiz(questions: Question[]): string {
  return questions
    .map((q, i) =>
      [
        `${i + 1} - ${q.text}`,
        ...q.options.map((o, k) => `${LETTERS[k].toLowerCase()}) ${o}`),
        `resposta: ${LETTERS[q.correct].toLowerCase()}`,
      ].join('\n'),
    )
    .join('\n\n');
}

// ---------- validação de dados vindos de fora (link compartilhado) ----------

export function isValidQuestion(q: unknown): q is Question {
  if (typeof q !== 'object' || q === null) return false;
  const { text, options, correct } = q as Record<string, unknown>;
  return (
    typeof text === 'string' &&
    text.trim() !== '' &&
    text.length <= MAX_QUESTION_CHARS &&
    Array.isArray(options) &&
    options.length >= MIN_OPTIONS &&
    options.length <= MAX_OPTIONS &&
    options.every((o) => typeof o === 'string' && o.trim() !== '' && o.length <= MAX_OPTION_CHARS) &&
    Number.isInteger(correct) &&
    (correct as number) >= 0 &&
    (correct as number) < options.length
  );
}

// ---------- exibição ----------

export interface Segment {
  code: boolean;
  text: string;
}

// Separa trechos `em crases` do texto normal (sem HTML: o componente monta <code> via React)
export function splitInlineCode(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(/`([^`\n]+)`/g)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ code: false, text: text.slice(last, at) });
    out.push({ code: true, text: m[1] });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ code: false, text: text.slice(last) });
  return out;
}

export interface Block {
  kind: 'text' | 'code';
  text: string;
}

// Separa o texto em trechos normais e blocos de código (entre linhas ```).
// Um bloco sem fechamento vale até o fim do texto.
export function splitBlocks(text: string): Block[] {
  const out: Block[] = [];
  let buf: string[] = [];
  let inCode = false;

  const flush = (kind: Block['kind']) => {
    const body = buf.join('\n').replace(/^\n+|\s+$/g, '');
    if (body !== '') out.push({ kind, text: body });
    buf = [];
  };

  for (const line of text.split('\n')) {
    if (line.trim().startsWith('```')) {
      flush(inCode ? 'code' : 'text');
      inCode = !inCode;
      continue;
    }
    buf.push(line);
  }
  flush(inCode ? 'code' : 'text');
  return out;
}

export const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
