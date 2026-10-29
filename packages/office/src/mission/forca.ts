// Fase 2, missão 4: o Marcos cochila jogando forca no tablet, o tablet cai e o ESTAGIÁRIO termina a partida.
// Este arquivo não depende de React nem do Phaser (testado com vitest).
import type { GameResult } from '@playground/games';

export interface HangmanCheck {
  /** Acertou todas as palavras da forca. */
  solved: boolean;
  wordsWon: number;
  words: number;
}

/** A partida só conta como resolvida com todas as palavras certas. */
export function checkHangman(result: GameResult): HangmanCheck {
  const details = (result.details ?? {}) as { wordsWon?: number; words?: unknown[] };
  const words = Array.isArray(details.words) ? details.words.length : 0;
  const wordsWon = typeof details.wordsWon === 'number' ? details.wordsWon : words;
  return { solved: words > 0 && wordsWon >= words, wordsWon, words };
}

/** Volume da musiquinha pela distância (px) até o tablet: alto perto, baixinho longe (sem sumir de todo). */
export function jingleVolume(distance: number): number {
  return Math.max(0.12, Math.min(1, 1 - (distance - 60) / 700));
}

/** Relógio do topo durante o cochilo: de `from` (minutos do dia) até `from + minutes`, `k` de 0 a 1. */
export function clockAt(from: number, minutes: number, k: number): string {
  const m = Math.round(from + minutes * Math.max(0, Math.min(1, k)));
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
