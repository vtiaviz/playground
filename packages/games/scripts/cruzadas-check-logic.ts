// Verificação da lógica. Rodar com:  npx tsx scripts/check-logic.ts
import assert from 'node:assert/strict';
import {
  buildGrid, compareInput, generateLayout, normalizeAnswer, parseEntries, validateLayout, wordCells,
  type Entry, type Layout,
} from '../src/cruzadas/lib/crossword';
import { activeWordIndex, arrow, backspace, emptyInput, initialSelection, selectCell, selectWord, stepWord, typeLetter } from '../src/cruzadas/lib/navigation';
import { crosswordScore, stars, timeScore } from '../src/cruzadas/lib/scoring';
import { decodeGame, encodeGame } from '../src/cruzadas/lib/share';

// ---------- verificador independente de layout ----------
function assertValidLayout(layout: Layout) {
  const letters = new Map<string, string>();
  const key = (r: number, c: number) => `${r},${c}`;

  for (const w of layout.words) {
    wordCells(w).forEach(({ row, col }, k) => {
      assert.ok(row >= 0 && col >= 0 && row < layout.rows && col < layout.cols, 'palavra fora da grade');
      const prev = letters.get(key(row, col));
      assert.ok(prev === undefined || prev === w.answer[k], `conflito de letras em ${row},${col}`);
      letters.set(key(row, col), w.answer[k]);
    });
  }

  // toda sequência de 2+ letras seguidas tem que ser exatamente uma palavra colocada
  const runs = (dir: 'across' | 'down') => {
    const found: string[] = [];
    const outer = dir === 'across' ? layout.rows : layout.cols;
    const inner = dir === 'across' ? layout.cols : layout.rows;
    for (let a = 0; a < outer; a++) {
      let start = -1;
      for (let b = 0; b <= inner; b++) {
        const r = dir === 'across' ? a : b;
        const c = dir === 'across' ? b : a;
        const has = b < inner && letters.has(key(r, c));
        if (has && start < 0) start = b;
        if (!has && start >= 0) {
          if (b - start >= 2) found.push(dir === 'across' ? `${a},${start},${b - start}` : `${start},${a},${b - start}`);
          start = -1;
        }
      }
    }
    return found.sort();
  };
  for (const dir of ['across', 'down'] as const) {
    const expected = layout.words
      .filter((w) => w.dir === dir)
      .map((w) => `${w.row},${w.col},${w.answer.length}`)
      .sort();
    assert.deepEqual(runs(dir), expected, `palavras acidentais na direção ${dir}`);
  }

  // tudo conectado
  const n = layout.words.length;
  const cellsOf = layout.words.map((w) => new Set(wordCells(w).map((c) => key(c.row, c.col))));
  const seen = new Set([0]);
  const queue = [0];
  while (queue.length) {
    const i = queue.pop()!;
    for (let j = 0; j < n; j++) {
      if (!seen.has(j) && [...cellsOf[i]].some((k) => cellsOf[j].has(k))) {
        seen.add(j);
        queue.push(j);
      }
    }
  }
  assert.equal(seen.size, n, 'layout desconectado');
}

// ---------- parse ----------
assert.equal(normalizeAnswer('Água'), 'AGUA');
assert.equal(normalizeAnswer('a-b'), null);

const parsed = parseEntries(
  [
    'cachorro  Melhor amigo do homem',
    'gato\tGosta de caçar ratos',
    '',
    'morcego Mamífero que voa',
    'ÁGUA   Líquido essencial',
    'elefante',          // sem dica
    'ab   curta',        // pouca letra
    'a-b-c  hífen',      // símbolo
    'gato  repetida',    // duplicada
    'canguru Marsupial grande',
  ].join('\n'),
);
assert.deepEqual(parsed.entries.map((e) => e.answer), ['CACHORRO', 'GATO', 'MORCEGO', 'AGUA', 'CANGURU']);
assert.equal(parsed.entries[0].clue, 'Melhor amigo do homem');
assert.deepEqual(parsed.errors.map((e) => e.line), [6, 7, 8, 9]);
assert.ok(parsed.errors[0].message.includes('falta a dica'));

const tooMany = parseEntries(Array.from({ length: 35 }, (_, i) => `${'abc'.repeat(2)}${String.fromCharCode(97 + (i % 26))}${i >= 26 ? 'x' : ''} dica`).join('\n'));
assert.equal(tooMany.entries.length, 30);
assert.ok(tooMany.errors.some((e) => e.line === 0));

// ---------- geração ----------
const base: Entry[] = parsed.entries.filter((e) => e.answer.length >= 3);
const g = generateLayout(base, { seed: 7 });
console.log(`5 palavras: ${g.layout.rows}x${g.layout.cols}, não encaixaram: [${g.unplaced.map((u) => u.answer)}]`);
assert.equal(g.layout.words.length + g.unplaced.length, base.length);
assertValidLayout(g.layout);

// determinismo e variedade
assert.deepEqual(generateLayout(base, { seed: 7 }), g);
const variants = new Set([1, 2, 3, 4, 5, 6].map((s) => JSON.stringify(generateLayout(base, { seed: s }).layout)));
assert.ok(variants.size >= 2, 'sementes diferentes deveriam dar layouts diferentes');

// numeração: 1.. em ordem de leitura; horizontal e vertical na mesma célula compartilham o número
const numbers = [...new Set(g.layout.words.map((w) => w.number))];
assert.deepEqual(numbers, numbers.map((_, i) => i + 1));
const byStart = new Map<string, number>();
for (const w of g.layout.words) {
  const k = `${w.row},${w.col}`;
  assert.ok(byStart.get(k) === undefined || byStart.get(k) === w.number);
  byStart.set(k, w.number);
}

// palavra sem letras em comum não encaixa e é informada
const lonely = generateLayout([{ answer: 'AAA', clue: 'x' }, { answer: 'BBB', clue: 'y' }], { seed: 1 });
assert.equal(lonely.layout.words.length, 1);
assert.equal(lonely.unplaced.length, 1);

// cruzada maior
const terms = 'tabela chave indice consulta gatilho visao procedimento transacao relacionamento normalizacao esquema coluna linha registro banco servidor backup restauracao cursor juncao agregacao subconsulta dados campo'.split(' ');
const big: Entry[] = terms.map((t, i) => ({ answer: t.toUpperCase(), clue: `Dica número ${i + 1}` }));
const t0 = Date.now();
const gb = generateLayout(big, { seed: 123 });
const ms = Date.now() - t0;
console.log(`${big.length} palavras: ${gb.layout.rows}x${gb.layout.cols}, encaixadas ${gb.layout.words.length}, fora [${gb.unplaced.map((u) => u.answer)}], ${ms} ms`);
assertValidLayout(gb.layout);
assert.ok(gb.layout.words.length >= Math.ceil(big.length * 0.8), 'deveria encaixar pelo menos 80%');
assert.ok(ms < 5000, 'geração lenta demais');

// ---------- grade e comparação ----------
const grid = buildGrid(g.layout);
const cellCount = grid.flat().filter(Boolean).length;
const input = grid.map((row) => row.map((c) => (c ? '' : '')));
let cmp = compareInput(grid, input);
assert.deepEqual([cmp.total, cmp.empty, cmp.solved], [cellCount, cellCount, false]);
grid.forEach((row, r) => row.forEach((c, k) => { if (c) input[r][k] = c.letter; }));
assert.equal(compareInput(grid, input).solved, true);
const first = grid.flatMap((row, r) => row.map((c, k) => (c ? { r, k, c } : null))).find(Boolean)!;
input[first.r][first.k] = first.c.letter === 'Z' ? 'Y' : 'Z';
cmp = compareInput(grid, input);
assert.equal(cmp.solved, false);
assert.deepEqual(cmp.wrong, [{ row: first.r, col: first.k }]);
// cada palavra aparece inteira na grade
g.layout.words.forEach((w, i) => wordCells(w).forEach(({ row, col }) => {
  const cell = grid[row][col]!;
  assert.equal(w.dir === 'across' ? cell.across : cell.down, i);
}));

// ---------- compartilhamento ----------
const cfg = { title: 'Animais', layout: g.layout };
assert.deepEqual(decodeGame('#' + encodeGame(cfg)), cfg);
assert.equal(decodeGame('lixo'), null);

const tamper = (mut: (w: Record<string, unknown>) => void) =>
  validateLayout(g.layout.words.map((w, i) => { const o: Record<string, unknown> = { ...w }; if (i === 0) mut(o); return o as never; }));
assert.ok(tamper(() => {}) !== null);
assert.equal(tamper((o) => { o.row = (o.row as number) + 50; }), null, 'fora dos limites');
assert.equal(tamper((o) => { o.answer = 'ab'; }), null, 'curta');
assert.equal(tamper((o) => { o.answer = 'Abc'; }), null, 'minúscula');
assert.equal(tamper((o) => { o.dir = 'diagonal'; }), null, 'direção inválida');
assert.equal(validateLayout([]), null);

// duas palavras cruzando com letras diferentes -> inválido
assert.equal(
  validateLayout([
    { answer: 'SOL', clue: 'a', row: 0, col: 0, dir: 'across' },
    { answer: 'MAR', clue: 'b', row: 0, col: 0, dir: 'down' },
  ]),
  null,
);

// ---------- pontuação ----------
// 50 células -> referência 150 s, mínimo em 600 s
assert.equal(timeScore(100, 50), 1000);
assert.equal(timeScore(150, 50), 1000);
assert.equal(timeScore(375, 50), 550);
assert.equal(timeScore(600, 50), 100);
assert.equal(timeScore(5000, 50), 100);
// penalidade por verificação (parâmetro): 100 s + 2 × 30 s = 160 s
assert.equal(timeScore(100, 50, 2, { maxScore: 1000, minScore: 100, secondsPerCell: 3, slowFactor: 4, checkPenaltySeconds: 30 }), 980);
assert.equal(timeScore(100, 50, 2), 1000); // padrão: verificar não custa nada
assert.deepEqual([stars(1000), stars(550), stars(300), stars(100)], [3, 2, 1, 0]);
const cs = crosswordScore(375, 50);
assert.deepEqual([cs.score, cs.stars, cs.referenceSeconds], [550, 2, 150]);


// ---------- navegação ----------
// CASA (horizontal), COLA e SOL (verticais):
//   C A S A
//   O . O .
//   L . L .
//   A . . .
const nl = validateLayout([
  { answer: 'CASA', clue: 'Moradia', row: 0, col: 0, dir: 'across' },
  { answer: 'COLA', clue: 'Adesivo', row: 0, col: 0, dir: 'down' },
  { answer: 'SOL', clue: 'Astro rei', row: 0, col: 2, dir: 'down' },
])!;
const ng = buildGrid(nl);
assert.deepEqual(nl.words.map((w) => [w.number, w.answer, w.dir]), [[1, 'CASA', 'across'], [1, 'COLA', 'down'], [2, 'SOL', 'down']]);
assert.deepEqual(initialSelection(nl), { row: 0, col: 0, dir: 'across' });
assert.equal(activeWordIndex(ng, { row: 0, col: 0, dir: 'down' }), 1);
assert.equal(activeWordIndex(ng, { row: 1, col: 1, dir: 'across' }), null);

// clique: mantém a direção; mesma célula alterna; célula vazia é ignorada
assert.deepEqual(selectCell(ng, { row: 0, col: 0, dir: 'across' }, 0, 1), { row: 0, col: 1, dir: 'across' });
assert.deepEqual(selectCell(ng, { row: 0, col: 0, dir: 'across' }, 0, 0), { row: 0, col: 0, dir: 'down' });
assert.deepEqual(selectCell(ng, { row: 0, col: 0, dir: 'down' }, 0, 0), { row: 0, col: 0, dir: 'across' });
assert.deepEqual(selectCell(ng, { row: 0, col: 1, dir: 'across' }, 1, 0), { row: 1, col: 0, dir: 'down' }, 'só existe vertical ali');
assert.equal(selectCell(ng, null, 1, 1), null);
assert.deepEqual(selectCell(ng, null, 0, 0), { row: 0, col: 0, dir: 'across' });

// digitar avança dentro da palavra e para no fim
let ed = { input: emptyInput(nl), selection: initialSelection(nl) };
for (const l of 'CAS') ed = typeLetter(nl, ng, ed.input, ed.selection, l);
assert.deepEqual(ed.input[0].join(''), 'CAS');
assert.deepEqual(ed.selection, { row: 0, col: 3, dir: 'across' });
ed = typeLetter(nl, ng, ed.input, ed.selection, 'A');
assert.deepEqual(ed.selection, { row: 0, col: 3, dir: 'across' }, 'no fim da palavra fica na última célula');
assert.equal(ed.input[0].join(''), 'CASA');

// backspace: limpa a célula atual; se vazia, volta e limpa a anterior
ed = backspace(nl, ng, ed.input, ed.selection); // (0,3) tem 'A' -> limpa
assert.deepEqual([ed.input[0].join(''), ed.selection.col], ['CAS', 3]);
ed = backspace(nl, ng, ed.input, ed.selection); // (0,3) vazia -> volta e limpa (0,2)
assert.deepEqual([ed.input[0].join(''), ed.selection.col], ['CA', 2]);
ed = backspace(nl, ng, emptyInput(nl), { row: 0, col: 0, dir: 'across' });
assert.deepEqual(ed.selection, { row: 0, col: 0, dir: 'across' }, 'no início não anda');

// setas
assert.deepEqual(arrow(ng, { row: 0, col: 0, dir: 'across' }, 'ArrowDown'), { row: 1, col: 0, dir: 'down' });
assert.deepEqual(arrow(ng, { row: 0, col: 0, dir: 'down' }, 'ArrowRight'), { row: 0, col: 1, dir: 'across' });
assert.deepEqual(arrow(ng, { row: 1, col: 0, dir: 'down' }, 'ArrowRight'), { row: 1, col: 2, dir: 'down' }, 'pula a célula vazia');
assert.deepEqual(arrow(ng, { row: 3, col: 0, dir: 'down' }, 'ArrowDown'), { row: 3, col: 0, dir: 'down' }, 'na borda fica');
assert.deepEqual(arrow(ng, { row: 0, col: 0, dir: 'across' }, 'ArrowUp'), { row: 0, col: 0, dir: 'across' });

// Tab: próxima/anterior palavra, com volta
assert.deepEqual(stepWord(nl, ng, { row: 0, col: 1, dir: 'across' }, 1), { row: 0, col: 0, dir: 'down' });
assert.deepEqual(stepWord(nl, ng, { row: 0, col: 0, dir: 'across' }, -1), selectWord(nl, 2));
assert.deepEqual(stepWord(nl, ng, selectWord(nl, 2), 1), { row: 0, col: 0, dir: 'across' });

console.log('Tudo certo: lógica das palavras cruzadas validada.');
