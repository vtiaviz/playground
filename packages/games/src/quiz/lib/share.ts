import LZString from 'lz-string';
import { MAX_QUESTIONS, isValidQuestion, type Question } from './quiz';

export interface GameConfig {
  title: string;
  questions: Question[];
}

// Link: { t: título, q: [[enunciado, [alternativas], índice da certa], ...] }
export function encodeGame(cfg: GameConfig): string {
  const q = cfg.questions.map((x) => [x.text, x.options, x.correct]);
  return LZString.compressToEncodedURIComponent(JSON.stringify({ t: cfg.title, q }));
}

// Hash da URL -> config validada (ou null se inválida/adulterada)
export function decodeGame(hash: string): GameConfig | null {
  try {
    const raw = LZString.decompressFromEncodedURIComponent(hash.replace(/^#/, ''));
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!Array.isArray(d.q) || d.q.length < 1 || d.q.length > MAX_QUESTIONS) return null;

    const questions: Question[] = [];
    for (const x of d.q) {
      if (!Array.isArray(x) || x.length !== 3) return null;
      const candidate = { text: x[0], options: x[1], correct: x[2] };
      if (!isValidQuestion(candidate)) return null;
      questions.push(candidate);
    }

    return {
      title: typeof d.t === 'string' && d.t.trim() ? d.t.slice(0, 80) : 'Quiz',
      questions,
    };
  } catch {
    return null;
  }
}
