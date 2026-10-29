// Verificação da lógica. Rodar com:  npx tsx scripts/check-logic.ts
import assert from 'node:assert/strict';
import { isValidQuestion, parseQuiz, splitBlocks, splitInlineCode, wordCount } from '../src/quiz/lib/quiz';
import { DEFAULT_PARAMS, quizScore, referenceSeconds, stars, timeFactor } from '../src/quiz/lib/scoring';
import { decodeGame, encodeGame } from '../src/quiz/lib/share';
import { iframeHeight, questionHeight } from '../src/quiz/lib/embed';

// ---------- os dois exemplos do usuário, exatamente como foram digitados ----------
const EXEMPLO = `1 - Qual a principal função do HD?
a) Armazenar informações
b) Criar novas paginas web
c) Ocupar espaço vazio no gabinete
d) É uma peça em desuso
respota: a

2 - Qual é a principal função do método \`Array.prototype.map()\` em JavaScript? 
A) Filtrar elementos de um array com base em uma condição 
B) Criar um novo array com os resultados da chamada de uma função para cada elemento 
C) Adicionar um novo elemento ao final do array 
D) Remover o primeiro elemento de um array
resposta: B
`;

const ex = parseQuiz(EXEMPLO);
assert.deepEqual(ex.errors, []);
assert.equal(ex.questions.length, 2);
assert.equal(ex.questions[0].text, 'Qual a principal função do HD?');
assert.deepEqual(ex.questions[0].options, [
  'Armazenar informações',
  'Criar novas paginas web',
  'Ocupar espaço vazio no gabinete',
  'É uma peça em desuso',
]);
assert.equal(ex.questions[0].correct, 0, '"respota: a" (com a grafia do exemplo) vale a alternativa A');
assert.equal(ex.questions[1].text, 'Qual é a principal função do método `Array.prototype.map()` em JavaScript?');
assert.equal(ex.questions[1].options[1], 'Criar um novo array com os resultados da chamada de uma função para cada elemento');
assert.equal(ex.questions[1].correct, 1, '"resposta: B" maiúscula vale a alternativa B');
assert.ok(ex.questions.every(isValidQuestion));

// ---------- variações toleradas ----------
const okOf = (txt: string) => {
  const r = parseQuiz(txt);
  assert.deepEqual(r.errors, [], txt);
  return r.questions;
};
// CRLF, numeração com ponto/parênteses/"Questão", gabarito em outras grafias, letras mistas
const v = okOf(
  [
    '5. Primeira?', 'a. sim', 'B) não', 'Gabarito: b', '',
    'Questão 6 - Segunda?', 'a) x', 'b) y', 'c) z', 'Resposta correta - c', '',
    '7) Terceira?', 'A) x', 'B) y', 'resposta: B) y',
  ].join('\r\n'),
);
assert.deepEqual(v.map((q) => q.correct), [1, 2, 1]);

// enunciado em várias linhas e alternativa que continua na linha seguinte
const multi = okOf(
  `1 - Leia o código:
const x = [1, 2, 3];
Qual o resultado de e.g. x.length?
a) 3
b) um número
   maior que três
resposta: a`,
);
assert.equal(multi[0].text, 'Leia o código:\nconst x = [1, 2, 3];\nQual o resultado de e.g. x.length?');
assert.deepEqual(multi[0].options, ['3', 'um número maior que três']);

// 6 alternativas, 2 alternativas
assert.equal(okOf('1 - q?\na) 1\nb) 2\nc) 3\nd) 4\ne) 5\nf) 6\nresposta: f')[0].correct, 5);
assert.equal(okOf('1 - q?\na) sim\nb) não\nresposta: a')[0].options.length, 2);

// ---------- erros com número da pergunta e da linha ----------
const e1 = parseQuiz('1 - q?\na) 1\nb) 2\nresposta: a\n\n2 - sem resposta\na) 1\nb) 2\n\n3 - ok?\na) 1\nb) 2\nresposta: b');
assert.equal(e1.questions.length, 2, 'a pergunta 3 é lida mesmo depois do erro da 2');
assert.equal(e1.errors.length, 1);
assert.equal(e1.errors[0].question, 2);
assert.match(e1.errors[0].message, /falta a linha de resposta/);

const e2 = parseQuiz('1 - q?\na) 1\nb) 2\nc) 3\nd) 4\nresposta: e');
assert.equal(e2.questions.length, 0);
assert.match(e2.errors[0].message, /"E" não corresponde a nenhuma alternativa \(há 4\)/);

const e3 = parseQuiz('1 - q?\na) 1\nc) 3\nresposta: a');
assert.equal(e3.errors.length, 1, 'só o primeiro problema de ordem é reportado');
assert.match(e3.errors[0].message, /fora de ordem \(esperava B\), encontrei C\)/);

const e4 = parseQuiz('1 - q?\na) única\nresposta: a');
assert.match(e4.errors[0].message, /pelo menos 2 alternativas/);

const e5 = parseQuiz('texto solto\n1 - q?\na) 1\nb) 2\nresposta: a');
assert.equal(e5.questions.length, 1);
assert.deepEqual([e5.errors.length, e5.errors[0].line], [1, 1]);
assert.match(e5.errors[0].message, /texto fora de uma pergunta/);

const e6 = parseQuiz('1 - q?\na) 1\nb) 2\nresposta: a\nPergunta sem número\na) 1\nb) 2\nresposta: a');
assert.equal(e6.questions.length, 1);
assert.match(e6.errors[0].message, /texto fora de uma pergunta/);

const e7 = parseQuiz('1 - q?\na) 1\nb) 2\nresposta: alternativa b');
assert.match(e7.errors[0].message, /linha de resposta inválida/);
assert.equal(e7.errors.length, 1, 'não duplica com "falta a resposta"');

const e8 = parseQuiz('1 - q?\na)\nb) 2\nresposta: b');
assert.match(e8.errors[0].message, /alternativa A\) está sem texto/);

assert.match(parseQuiz('resposta: a').errors[0].message, /sem uma pergunta aberta/);

const tooLong = parseQuiz(`1 - ${'x'.repeat(801)}\na) 1\nb) 2\nresposta: a`);
assert.match(tooLong.errors[0].message, /passa de 800 caracteres/);

// mais de 30 perguntas: avisa e corta
const many = Array.from({ length: 32 }, (_, i) => `${i + 1} - q${i}?\na) 1\nb) 2\nresposta: a`).join('\n\n');
const m = parseQuiz(many);
assert.equal(m.questions.length, 30);
assert.deepEqual([m.errors[0].line, m.errors[0].question], [0, 0]);

assert.deepEqual(parseQuiz(''), { questions: [], errors: [] });

// ---------- código entre crases ----------
assert.deepEqual(splitInlineCode('use `map()` e `filter()` aqui'), [
  { code: false, text: 'use ' }, { code: true, text: 'map()' },
  { code: false, text: ' e ' }, { code: true, text: 'filter()' }, { code: false, text: ' aqui' },
]);
assert.deepEqual(splitInlineCode('sem crases'), [{ code: false, text: 'sem crases' }]);
assert.deepEqual(splitInlineCode('crase solta ` aqui'), [{ code: false, text: 'crase solta ` aqui' }]);
assert.deepEqual(splitInlineCode('`só código`'), [{ code: true, text: 'só código' }]);
assert.deepEqual(splitInlineCode(''), []);
// nunca vira HTML: o texto fica literal
assert.deepEqual(splitInlineCode('<img src=x onerror=alert(1)>'), [{ code: false, text: '<img src=x onerror=alert(1)>' }]);


// ---------- blocos de código (```) no enunciado ----------
const code = parseQuiz(
  [
    '1 - O que imprime?',
    '```js',
    'const itens = [1, 2];',
    '',
    'a) isto não é alternativa',
    '2 - nem isto é uma pergunta',
    'resposta: z',
    '  itens.forEach((n) => {',
    '    console.log(n);',
    '  });',
    '```',
    'a) 1 e 2',
    'b) nada',
    'resposta: a',
  ].join('\n'),
);
assert.deepEqual(code.errors, []);
assert.equal(code.questions.length, 1);
assert.equal(code.questions[0].options.length, 2);
assert.equal(
  code.questions[0].text,
  [
    'O que imprime?', '```js', 'const itens = [1, 2];', '',
    'a) isto não é alternativa', '2 - nem isto é uma pergunta', 'resposta: z',
    '  itens.forEach((n) => {', '    console.log(n);', '  });', '```',
  ].join('\n'),
  'o conteúdo do bloco é copiado como está, com indentação e linhas em branco',
);
assert.deepEqual(splitBlocks(code.questions[0].text), [
  { kind: 'text', text: 'O que imprime?' },
  {
    kind: 'code',
    text: ['const itens = [1, 2];', '', 'a) isto não é alternativa', '2 - nem isto é uma pergunta', 'resposta: z', '  itens.forEach((n) => {', '    console.log(n);', '  });'].join('\n'),
  },
]);

const unclosed = parseQuiz('1 - q?\n```\ncódigo\na) 1\nb) 2\nresposta: a');
assert.equal(unclosed.questions.length, 0);
assert.equal(unclosed.errors.length, 1);
assert.match(unclosed.errors[0].message, /bloco de código sem fechamento/);

// perguntas seguintes continuam sendo lidas depois de um bloco bem fechado
const two = okOf('1 - a?\n```\nx\n```\na) 1\nb) 2\nresposta: a\n\n2 - b?\na) 1\nb) 2\nresposta: b');
assert.equal(two.length, 2);

assert.deepEqual(splitBlocks('só texto'), [{ kind: 'text', text: 'só texto' }]);
assert.deepEqual(splitBlocks('antes\n```\ncod\n```\ndepois'), [
  { kind: 'text', text: 'antes' }, { kind: 'code', text: 'cod' }, { kind: 'text', text: 'depois' },
]);
assert.deepEqual(splitBlocks('```\nsem fechar\nainda código'), [{ kind: 'code', text: 'sem fechar\nainda código' }]);
assert.deepEqual(splitBlocks(''), []);

// ---------- pontuação ----------
assert.equal(wordCount('  Qual a  principal função do HD? '), 6);
// HD: enunciado 6 + alternativas 2+4+5+5 = 22 palavras -> 5 + 0,25 × 22 = 10,5 s
// map(): enunciado 10 + alternativas 10+15+8+7 = 50 palavras -> 5 + 0,25 × 50 = 17,5 s
assert.equal(referenceSeconds(ex.questions), 28);

assert.equal(timeFactor(10, 28), 1);
assert.equal(timeFactor(28, 28), 1);
assert.equal(timeFactor(70, 28), 0.5); // metade do caminho entre 28 s e 112 s
assert.equal(timeFactor(112, 28), 0);
assert.equal(timeFactor(999, 28), 0);

const ref = referenceSeconds(ex.questions);
let s = quizScore([true, true], 20, ref);
assert.deepEqual([s.score, s.max, s.percent, s.stars, s.accuracyPoints, s.timeBonus], [300, 300, 100, 3, 200, 100]);
s = quizScore([true, true], 70, ref);
assert.deepEqual([s.score, s.percent, s.stars, s.timeBonus], [250, 83, 3, 50]);
s = quizScore([true, false], 70, ref);
assert.deepEqual([s.score, s.percent, s.stars], [125, 42, 1], 'quem erra não ganha bônus de tempo');
s = quizScore([true, true], 500, ref);
assert.deepEqual([s.score, s.percent, s.stars], [200, 67, 2], 'lento mas certo ainda pontua');
s = quizScore([false, false], 5, ref);
assert.deepEqual([s.score, s.percent, s.stars], [0, 0, 0]);
assert.deepEqual(
  (({ score, max, percent }) => ({ score, max, percent }))(quizScore([], 5, 0)),
  { score: 0, max: 0, percent: 0 },
);
assert.deepEqual([stars(100), stars(80), stars(79), stars(50), stars(20), stars(19)], [3, 3, 2, 2, 1, 0]);
assert.equal(DEFAULT_PARAMS.pointsPerCorrect, 100);


// ---------- altura sugerida do iframe ----------
{
  const curta = parseQuiz('1 - Quanto é 2+2?\na) 4\nb) 5\nresposta: a').questions;
  const longa = parseQuiz(`1 - ${'palavra '.repeat(60)}\n\`\`\`\n${'linha de código\n'.repeat(12)}\`\`\`\na) ${'x '.repeat(40)}\nb) 2\nc) 3\nd) 4\nresposta: a`).questions;
  assert.ok(questionHeight(longa[0]) > questionHeight(curta[0]), 'pergunta longa precisa de mais altura');
  assert.ok(iframeHeight(curta) >= 560 && iframeHeight(curta) <= 700, 'quiz curto: perto do mínimo');
  assert.ok(iframeHeight(longa) >= questionHeight(longa[0]) - 5 || iframeHeight(longa) === 1400, 'nunca menor que a pergunta mais alta');
  assert.ok(iframeHeight(longa) > iframeHeight(curta));
  assert.equal(iframeHeight(Array.from({ length: 30 }, () => curta[0])), 1400, 'máximo (o iframe rola por dentro)');
  assert.equal(iframeHeight([]), 560);
  assert.equal(iframeHeight(ex.questions) % 10, 0);
}

// ---------- compartilhamento ----------
const cfg = { title: 'Informática', questions: ex.questions };
assert.deepEqual(decodeGame('#' + encodeGame(cfg)), cfg);
assert.equal(decodeGame('lixo'), null);
assert.equal(decodeGame(encodeGame({ title: 'x', questions: [] })), null, 'sem perguntas');
const bad = (mut: (q: { text: unknown; options: unknown; correct: unknown }) => void) => {
  const q = JSON.parse(JSON.stringify(ex.questions[0]));
  mut(q);
  return decodeGame(encodeGame({ title: 'x', questions: [q] }));
};
assert.ok(bad(() => {}) !== null);
assert.equal(bad((q) => { q.correct = 9; }), null, 'gabarito fora das alternativas');
assert.equal(bad((q) => { q.correct = -1; }), null);
assert.equal(bad((q) => { q.options = ['só uma']; }), null, 'menos de 2 alternativas');
assert.equal(bad((q) => { q.options = ['a', 'b', 'c', 'd', 'e', 'f', 'g']; }), null, 'mais de 6');
assert.equal(bad((q) => { q.text = ''; }), null);
assert.equal(bad((q) => { q.text = 123; }), null);
assert.equal(bad((q) => { q.options = ['a', 5]; }), null);
// título vazio vira o padrão
assert.equal(decodeGame(encodeGame({ title: '   ', questions: ex.questions }))!.title, 'Quiz');


// ---------- robustez: entradas aleatórias nunca quebram e só devolvem perguntas válidas ----------
{
  const pieces = ['1 - ', '2. ', 'Questão 3: ', 'a) ', 'B) ', 'c. ', 'e.g. ', 'resposta: ', 'respota: ', 'gabarito - ', 'a', 'b', 'c', 'e', 'texto ', '`', '```', '```js', '`código`', '\n', '\n\n', '\r\n', '  ', '<b>', '\u200b', 'é', '5', ': ', ') ', '- '];
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 3000; i++) {
    const n = 1 + Math.floor(rnd() * 40);
    let txt = '';
    for (let k = 0; k < n; k++) txt += pieces[Math.floor(rnd() * pieces.length)];
    const r = parseQuiz(txt);
    assert.ok(r.questions.every(isValidQuestion), `pergunta inválida para: ${JSON.stringify(txt)}`);
    assert.ok(r.questions.length <= 30);
    for (const e of r.errors) assert.ok(typeof e.message === 'string' && e.line >= 0);
    // o que o leitor aceita sempre sobrevive ao ciclo do link
    if (r.questions.length > 0) {
      const back = decodeGame(encodeGame({ title: 't', questions: r.questions }));
      assert.deepEqual(back?.questions, r.questions);
    }
  }
}

console.log('Tudo certo: lógica do quiz validada.');
