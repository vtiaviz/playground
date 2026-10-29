// hangman.ts — lógica pura do jogo da forca (sem React, sem DOM)

export const MIN_LETTERS = 3;
export const MAX_LETTERS = 20;
export const MAX_ERRORS = 6;

export interface Secret {
  display: string; // como é exibida: maiúsculas, com acentos, espaços e hífens
  base: string;    // mesmo tamanho, sem acentos (letras A–Z)
}

// Letra digitada/clicada -> letra base A–Z. Retorna null se não for uma letra latina
// (ou se vier uma tecla como "Enter", que tem mais de um caractere).
export function normalizeLetter(input: string): string | null {
  if ([...input].length !== 1) return null;
  const b = input.normalize('NFD')[0].toUpperCase();
  return /^[A-Z]$/.test(b) ? b : null;
}

export type WordCheck = { ok: true; secret: Secret } | { ok: false; reason: string };

// Valida e prepara uma palavra digitada no editor
export function validateWord(raw: string): WordCheck {
  const display = raw.normalize('NFC').trim().replace(/\s+/g, ' ').toUpperCase();
  let base = '';
  let letters = 0;

  for (const ch of display) {
    if (ch === ' ' || ch === '-') {
      base += ch;
      continue;
    }
    const b = normalizeLetter(ch);
    if (!b) return { ok: false, reason: `caractere não permitido: "${ch}"` };
    base += b;
    letters++;
  }

  if (letters < MIN_LETTERS) return { ok: false, reason: `mínimo de ${MIN_LETTERS} letras` };
  if (letters > MAX_LETTERS) return { ok: false, reason: `máximo de ${MAX_LETTERS} letras` };
  return { ok: true, secret: { display, base } };
}

// ---------- estado de uma palavra ----------

export interface WordState {
  secret: Secret;
  maxErrors: number;
  guessed: string[]; // letras base já tentadas, na ordem
  wrong: string[];   // subconjunto de guessed que não está na palavra
  status: 'playing' | 'won' | 'lost';
}

export function newWord(secret: Secret, maxErrors = MAX_ERRORS): WordState {
  return { secret, maxErrors, guessed: [], wrong: [], status: 'playing' };
}

const isLetter = (c: string) => c >= 'A' && c <= 'Z';

// Aplica um palpite. Devolve o MESMO objeto se nada mudou (jogo encerrado,
// tecla inválida ou letra repetida), o que evita re-renderizações no React.
export function guess(state: WordState, input: string): WordState {
  if (state.status !== 'playing') return state;

  const letter = normalizeLetter(input);
  if (!letter || state.guessed.includes(letter)) return state;

  const guessed = [...state.guessed, letter];
  const hit = state.secret.base.includes(letter);
  const wrong = hit ? state.wrong : [...state.wrong, letter];

  const allFound = [...state.secret.base].every((c) => !isLetter(c) || guessed.includes(c));
  const status = allFound ? 'won' : wrong.length >= state.maxErrors ? 'lost' : 'playing';

  return { ...state, guessed, wrong, status };
}

export const errorsLeft = (s: WordState) => s.maxErrors - s.wrong.length;

// ---------- para exibir a palavra ----------

export interface Cell {
  char: string;      // caractere exibido (com acento)
  isLetter: boolean; // false para espaço e hífen
  visible: boolean;  // já revelado?
  missed: boolean;   // revelado só porque o jogador perdeu (dá para pintar de outra cor)
}

export function cells(state: WordState): Cell[] {
  const chars = [...state.secret.display];
  const bases = [...state.secret.base];
  return chars.map((char, i) => {
    const letter = isLetter(bases[i]);
    const found = !letter || state.guessed.includes(bases[i]);
    return {
      char,
      isLetter: letter,
      visible: found || state.status === 'lost',
      missed: letter && !found && state.status === 'lost',
    };
  });
}
