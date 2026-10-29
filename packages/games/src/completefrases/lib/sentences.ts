// sentences.ts — formato das frases com lacunas (texto do editor <-> config), sem React.
//
// No editor, cada linha é uma frase; a palavra certa vai entre colchetes:
//   A preferência, no trânsito, é de quem vem do lado [direito].
//   > Explicação opcional, mostrada depois do envio.
// Uma frase pode ter mais de uma lacuna. A numeração no início ("1 -", "1.", "1)") é ignorada.

export const MAX_SENTENCES = 30;
export const MAX_BLANKS_PER_SENTENCE = 5;
export const MAX_DECOYS = 20;
export const MAX_SENTENCE_LEN = 400; // texto da frase, já com as palavras certas
export const MAX_WORD_LEN = 40;
export const MAX_EXPLANATION_LEN = 300;

export interface Sentence {
  // texto antes, entre e depois das lacunas: segments.length === answers.length + 1
  segments: string[];
  answers: string[];
  explanation: string; // '' = sem explicação
}

export interface ParseError {
  line: number; // 1-based
  message: string;
}

// Comparação de palavras: ignora maiúsculas e espaços repetidos ("Encarregado" == "encarregado")
export const normalizeWord = (s: string): string => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');

const clean = (s: string) => s.replace(/\s+/g, ' ');

export const sentenceText = (s: Sentence): string =>
  s.segments.reduce((acc, seg, i) => acc + seg + (i < s.answers.length ? s.answers[i] : ''), '');

export function isValidSentence(x: unknown): x is Sentence {
  if (typeof x !== 'object' || x === null) return false;
  const s = x as Record<string, unknown>;
  if (!Array.isArray(s.segments) || !Array.isArray(s.answers)) return false;
  if (s.answers.length < 1 || s.answers.length > MAX_BLANKS_PER_SENTENCE) return false;
  if (s.segments.length !== s.answers.length + 1) return false;
  if (!s.segments.every((p) => typeof p === 'string')) return false;
  if (!s.answers.every((a) => typeof a === 'string' && a.trim() !== '' && a.trim().length <= MAX_WORD_LEN)) return false;
  if (s.explanation !== undefined && typeof s.explanation !== 'string') return false;
  if (typeof s.explanation === 'string' && s.explanation.length > MAX_EXPLANATION_LEN) return false;
  return sentenceText(s as unknown as Sentence).length <= MAX_SENTENCE_LEN;
}

export const isValidWord = (w: unknown): w is string =>
  typeof w === 'string' && w.trim() !== '' && w.trim().length <= MAX_WORD_LEN;

// "A preferência é do lado [direito]." -> { segments: ['A preferência é do lado ', '.'], answers: ['direito'] }
function parseLine(text: string): { sentence?: Omit<Sentence, 'explanation'>; error?: string } {
  const segments: string[] = [];
  const answers: string[] = [];
  let rest = text;
  for (;;) {
    const open = rest.indexOf('[');
    const close = rest.indexOf(']');
    if (open === -1) {
      if (close !== -1) return { error: 'tem "]" sem o "[" correspondente.' };
      segments.push(rest);
      break;
    }
    if (close !== -1 && close < open) return { error: 'tem "]" sem o "[" correspondente.' };
    if (close === -1) return { error: 'tem "[" sem fechar com "]".' };
    const word = clean(rest.slice(open + 1, close)).trim();
    if (word.includes('[')) return { error: 'tem colchetes dentro de colchetes.' };
    if (!word) return { error: 'tem uma lacuna vazia "[]".' };
    if (word.length > MAX_WORD_LEN) return { error: `a palavra "${word.slice(0, 20)}…" passa de ${MAX_WORD_LEN} caracteres.` };
    segments.push(rest.slice(0, open));
    answers.push(word);
    rest = rest.slice(close + 1);
  }
  if (answers.length === 0) return { error: 'não tem lacuna. Coloque a palavra certa entre colchetes, como [direito].' };
  if (answers.length > MAX_BLANKS_PER_SENTENCE) return { error: `tem mais de ${MAX_BLANKS_PER_SENTENCE} lacunas.` };
  const sentence = { segments: segments.map(clean), answers };
  if (sentenceText({ ...sentence, explanation: '' }).length > MAX_SENTENCE_LEN)
    return { error: `passa de ${MAX_SENTENCE_LEN} caracteres.` };
  return { sentence };
}

export function parseSentences(text: string): { sentences: Sentence[]; errors: ParseError[] } {
  const sentences: Sentence[] = [];
  const errors: ParseError[] = [];

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    const t = raw.trim();
    if (!t) return;

    if (t.startsWith('>')) {
      const last = sentences[sentences.length - 1];
      const exp = clean(t.slice(1)).trim();
      if (!last) errors.push({ line, message: `Linha ${line}: explicação ("> ...") antes de qualquer frase.` });
      else if (last.explanation) errors.push({ line, message: `Linha ${line}: a frase já tem uma explicação; junte as duas numa linha só.` });
      else if (exp.length > MAX_EXPLANATION_LEN)
        errors.push({ line, message: `Linha ${line}: a explicação passa de ${MAX_EXPLANATION_LEN} caracteres.` });
      else last.explanation = exp;
      return;
    }

    const body = t.replace(/^\d+\s*[-.)]\s*/, '');
    const { sentence, error } = parseLine(body);
    if (error || !sentence) {
      errors.push({ line, message: `Linha ${line}: a frase ${error}` });
      return;
    }
    sentences.push({ ...sentence, explanation: '' });
  });

  if (sentences.length > MAX_SENTENCES)
    errors.push({ line: 0, message: `São ${sentences.length} frases; o máximo é ${MAX_SENTENCES}.` });
  return { sentences, errors };
}

// Inverso de parseSentences (para reabrir um jogo salvo no editor)
export function formatSentences(sentences: Sentence[]): string {
  return sentences
    .map((s) => {
      const line = s.segments.reduce((acc, seg, i) => acc + seg + (i < s.answers.length ? `[${s.answers[i]}]` : ''), '');
      return s.explanation ? `${line}\n> ${s.explanation}` : line;
    })
    .join('\n\n');
}

// Palavras extras: separadas por vírgula, ponto e vírgula ou linha. Repetidas são ignoradas.
export function parseDecoys(text: string, sentences: Sentence[]): { decoys: string[]; errors: string[] } {
  const answers = new Set(sentences.flatMap((s) => s.answers.map(normalizeWord)));
  const seen = new Set<string>();
  const decoys: string[] = [];
  const errors: string[] = [];
  for (const raw of text.split(/[,;\n]/)) {
    const w = clean(raw).trim();
    if (!w) continue;
    const key = normalizeWord(w);
    if (seen.has(key)) continue;
    seen.add(key);
    if (w.length > MAX_WORD_LEN) errors.push(`A palavra extra "${w.slice(0, 20)}…" passa de ${MAX_WORD_LEN} caracteres.`);
    else if (answers.has(key)) errors.push(`"${w}" já é resposta de uma frase; não pode ser palavra extra.`);
    else decoys.push(w);
  }
  if (decoys.length > MAX_DECOYS) errors.push(`São ${decoys.length} palavras extras; o máximo é ${MAX_DECOYS}.`);
  return { decoys, errors };
}

// Embaralhamento de Fisher–Yates (random injetável para os testes)
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
