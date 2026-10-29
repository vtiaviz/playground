// Verificação rápida da lógica. Rodar com:  npx tsx scripts/check-logic.ts
import assert from 'node:assert/strict';
import { cells, errorsLeft, guess, newWord, validateWord, type WordState } from '../src/forca/lib/hangman';
import { gameScore, wordScore } from '../src/forca/lib/scoring';
import { decodeGame, encodeGame, type GameConfig } from '../src/forca/lib/share';

const secretOf = (w: string) => {
  const c = validateWord(w);
  if (!c.ok) throw new Error(c.reason);
  return c.secret;
};
const play = (s: WordState, letters: string) => [...letters].reduce(guess, s);

// --- validação de palavras ---
const oleos = validateWord('óleos');
assert.ok(oleos.ok && oleos.secret.display === 'ÓLEOS' && oleos.secret.base === 'OLEOS');
const acao = validateWord('  ação ');
assert.ok(acao.ok && acao.secret.base === 'ACAO');
const guarda = validateWord('guarda-chuva');
assert.ok(guarda.ok && guarda.secret.base === 'GUARDA-CHUVA');
assert.ok(!validateWord('ab').ok);
assert.ok(!validateWord('a1b2c').ok);
assert.ok(!validateWord('a'.repeat(21)).ok);

// --- jogo: vitória, acento, repetição, teclas inválidas ---
let s = newWord(secretOf('óleos'));
s = play(s, 'olx'); // 'o' acerta 'Ó'; 'x' erra
assert.equal(s.status, 'playing');
assert.deepEqual(s.wrong, ['X']);
assert.equal(errorsLeft(s), 5);
assert.equal(guess(s, 'x'), s, 'letra repetida não muda o estado');
assert.equal(guess(s, 'Enter'), s, 'tecla com mais de um caractere é ignorada');
assert.equal(guess(s, '1'), s, 'não-letra é ignorada');
s = play(s, 'es');
assert.equal(s.status, 'won');
assert.equal(guess(s, 'z'), s, 'jogo encerrado não aceita palpites');

// --- jogo: derrota após 6 erros e revelação ---
let l = newWord(secretOf('lagoa'));
l = play(l, 'bcdfhj');
assert.equal(l.status, 'lost');
assert.ok(cells(l).every((c) => c.visible));
assert.ok(cells(l).every((c) => c.missed)); // nenhuma letra tinha sido achada

// hífen e espaço já aparecem revelados
const g = newWord(secretOf('guarda-chuva'));
assert.ok(cells(g).find((c) => c.char === '-')!.visible);
assert.ok(!cells(g).find((c) => c.char === 'G')!.visible);

// --- pontuação ---
assert.equal(wordScore({ word: 'A', won: true, errors: 0, seconds: 0 }), 150);
assert.equal(wordScore({ word: 'A', won: true, errors: 2, seconds: 30 }), 95);
assert.equal(wordScore({ word: 'A', won: true, errors: 0, seconds: 90 }), 100);
assert.equal(wordScore({ word: 'A', won: true, errors: 10, seconds: 999 }), 0);
assert.equal(wordScore({ word: 'A', won: false, errors: 6, seconds: 5 }), 0);

const perfect = Array.from({ length: 5 }, () => ({ word: 'A', won: true, errors: 0, seconds: 0 }));
const gs = gameScore(perfect);
assert.deepEqual([gs.total, gs.max, gs.percent, gs.stars], [750, 750, 100, 3]);
const bad = Array.from({ length: 5 }, () => ({ word: 'A', won: false, errors: 6, seconds: 10 }));
assert.deepEqual([gameScore(bad).total, gameScore(bad).stars], [0, 0]);

// --- compartilhamento ---
const cfg: GameConfig = {
  title: 'Banco de dados',
  theme: 'Termos de SQL',
  words: ['tabela', 'chave primária', 'índice', 'consulta', 'gatilho'],
};
assert.deepEqual(decodeGame('#' + encodeGame(cfg)), cfg);
assert.equal(decodeGame('lixo'), null);
assert.equal(decodeGame(encodeGame({ ...cfg, words: cfg.words.slice(0, 4) })), null, 'exige 5 palavras');
assert.equal(decodeGame(encodeGame({ ...cfg, words: [...cfg.words.slice(0, 4), 'x1']})), null, 'palavra inválida');
// links antigos que ainda tragam maxErrors continuam válidos (o campo é ignorado)
assert.deepEqual(decodeGame(encodeGame({ ...cfg, maxErrors: 99 } as GameConfig)), cfg);

console.log('Tudo certo: lógica da forca validada.');
