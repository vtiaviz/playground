import { describe, expect, it } from 'vitest';
import { AI_SPECS, LEVELS, buildMessages, convertResponse, parseModelJson } from '../src/ai';
import { GAME_TYPES, type GameType } from '../src/types';
import { maxScoreFor, validateGameConfig } from '../src/validate';

// Respostas típicas de um modelo (com alguns itens ruins de propósito, que devem ser descartados)
const q = (text: string, options: string[], correct: unknown) => ({ text, options, correct });
const quizLevel = (n: number) => ({
  questions: [
    q('O que é um roteador?', ['Encaminha pacotes entre redes', 'Imprime documentos', 'Guarda arquivos'], 0),
    q('Qual camada cuida do endereçamento IP?', ['Rede', 'Física', 'Aplicação'], 'a'),
    q('O que significa LAN?', ['Rede local', 'Rede mundial', 'Rede sem fio'], 'Rede local'),
    q('Pergunta ruim sem alternativas', [], 0),
    q('Índice fora do intervalo', ['x', 'y'], 5),
    ...Array.from({ length: n }, (_, i) => q(`Pergunta extra ${i + 1}?`, ['certa', 'errada 1', 'errada 2', 'errada 3'], 0)),
  ],
});

const SAMPLES: Record<GameType, Record<string, unknown>> = {
  QUIZ: { title: 'Redes de computadores', easy: quizLevel(2), normal: quizLevel(5), hard: quizLevel(7) },
  FORCA: {
    title: 'Redes',
    easy: { theme: 'Redes', words: ['rede', 'cabo', 'porta', 'switch', 'nuvem', 'wi-fi', 'IP'] },
    normal: { theme: 'Redes', words: ['roteador', 'protocolo', 'pacote', 'servidor', 'cliente', '192.168'] },
    hard: { theme: 'Redes', words: ['encapsulamento', 'endereçamento', 'sub-rede', 'gateway padrão', 'latência', 'largura'] },
  },
  CACA_PALAVRAS: {
    title: 'Redes',
    easy: { words: ['rede', 'cabo', 'porta', 'nuvem', 'switch', 'wi-fi', 'ip', 'modem'] },
    normal: { words: ['roteador', 'protocolo', 'pacote', 'servidor', 'cliente', 'firewall', 'internet', 'endereço', 'antena', 'sinal'] },
    hard: { words: ['encapsulamento', 'endereçamento', 'latência', 'topologia', 'criptografia', 'autenticação', 'gateway', 'bandwidth', 'protocolo', 'roteamento'] },
  },
  CRUZADAS: {
    title: 'Redes',
    easy: {
      entries: [
        { answer: 'REDE', clue: 'Conjunto de computadores ligados' },
        { answer: 'CABO', clue: 'Meio físico que leva o sinal' },
        { answer: 'PORTA', clue: 'Onde se conecta o cabo no switch' },
        { answer: 'MODEM', clue: 'Converte o sinal da operadora' },
        { answer: 'IP', clue: 'curta demais' },
        { answer: 'NUVEM', clue: 'A palavra nuvem aparece na dica' },
      ],
    },
    normal: {
      entries: [
        { answer: 'Roteador', clue: 'Liga redes diferentes' },
        { answer: 'Protocolo', clue: 'Conjunto de regras de comunicação' },
        { answer: 'Pacote', clue: 'Unidade de dados na rede' },
        { answer: 'Servidor', clue: 'Oferece serviços aos clientes' },
      ],
    },
    hard: {
      entries: [
        { answer: 'Latência', clue: 'Atraso da ida e volta' },
        { answer: 'Topologia', clue: 'Desenho lógico ou físico da rede' },
        { answer: 'Gateway', clue: 'Saída padrão para outra rede' },
        { answer: 'Criptografia', clue: 'Torna a mensagem ilegível para terceiros' },
        { answer: 'Firewall', clue: 'Filtra o tráfego' },
      ],
    },
  },
  COMPLETE_FRASES: {
    title: 'Redes',
    easy: {
      sentences: [
        { text: 'O [roteador] encaminha pacotes entre redes.', explanation: 'Ele escolhe o caminho.' },
        { text: 'Uma rede [local] cobre uma área pequena.' },
        { text: 'Frase sem lacuna nenhuma.' },
        'O [switch] liga os computadores da mesma rede.',
      ],
      decoys: [],
    },
    normal: {
      sentences: [
        { text: 'O [IP] identifica um dispositivo na [rede].' },
        { text: 'O [DNS] traduz nomes em endereços.' },
        { text: 'O [firewall] filtra o tráfego.' },
      ],
      decoys: ['DHCP', 'IP', 'proxy'],
    },
    hard: {
      sentences: [
        { text: 'A [latência] mede o atraso da comunicação.' },
        { text: 'A [largura de banda] mede a capacidade do canal.' },
        { text: 'O [gateway] é a saída padrão para outras redes.' },
      ],
      decoys: ['vazão', 'jitter'],
    },
  },
};

describe('gerador de conteúdo com IA (conversão)', () => {
  it('tem um gerador para cada jogo', () => {
    expect(Object.keys(AI_SPECS).sort()).toEqual([...GAME_TYPES].sort());
  });

  for (const type of GAME_TYPES) {
    it(`${type}: converte os três níveis em configs válidas`, () => {
      const { title, levels } = convertResponse(type, SAMPLES[type], { fallbackTitle: 'x', seed: 42 });
      expect(levels.map((l) => l.level)).toEqual([...LEVELS]);
      for (const l of levels) {
        expect(l.config, `${type} ${l.level}`).not.toBeNull();
        expect(validateGameConfig(type, l.config)).not.toBeNull();
        expect(maxScoreFor(type, l.config)).toBeGreaterThan(0);
        expect(l.title.startsWith(title)).toBe(true);
        expect(l.answerKey.length).toBeGreaterThan(0);
      }
      expect(levels.map((l) => l.title)).toEqual([`${title} — Fácil`, `${title} — Normal`, `${title} — Difícil`]);
    });
  }

  it('quiz: descarta perguntas ruins, entende letra/texto como resposta e embaralha mantendo o gabarito', () => {
    const { levels } = convertResponse('QUIZ', SAMPLES.QUIZ, { fallbackTitle: 'x', seed: 1 });
    const cfg = levels[0].config as { questions: { text: string; options: string[]; correct: number }[] };
    expect(cfg.questions).toHaveLength(5);
    expect(cfg.questions[0].options[cfg.questions[0].correct]).toBe('Encaminha pacotes entre redes');
    expect(cfg.questions[1].options[cfg.questions[1].correct]).toBe('Rede');
    expect(cfg.questions[2].options[cfg.questions[2].correct]).toBe('Rede local');
  });

  it('forca: usa as 5 primeiras palavras válidas', () => {
    const { levels } = convertResponse('FORCA', SAMPLES.FORCA, { fallbackTitle: 'x', seed: 1 });
    expect((levels[0].config as { words: string[] }).words).toEqual(['rede', 'cabo', 'porta', 'switch', 'nuvem']);
    expect((levels[1].config as { words: string[] }).words).not.toContain('192.168');
  });

  it('cruzadas: descarta resposta curta e dica que entrega a resposta', () => {
    const { levels } = convertResponse('CRUZADAS', SAMPLES.CRUZADAS, { fallbackTitle: 'x', seed: 3 });
    const answers = (levels[0].config as { layout: { words: { answer: string }[] } }).layout.words.map((w) => w.answer);
    expect(answers).not.toContain('IP');
    expect(answers).not.toContain('NUVEM');
    expect((levels[2].config as { layout: { words: { answer: string }[] } }).layout.words.map((w) => w.answer)).toContain('LATENCIA');
  });

  it('complete as frases: pega a lacuna entre colchetes e tira pegadinha igual a resposta', () => {
    const { levels } = convertResponse('COMPLETE_FRASES', SAMPLES.COMPLETE_FRASES, { fallbackTitle: 'x', seed: 1 });
    const easy = levels[0].config as { sentences: { answers: string[]; explanation: string }[] };
    expect(easy.sentences.map((s) => s.answers)).toEqual([['roteador'], ['local'], ['switch']]);
    expect(easy.sentences[0].explanation).toBe('Ele escolhe o caminho.');
    expect((levels[1].config as { decoys: string[] }).decoys).toEqual(['DHCP', 'proxy']);
  });

  it('nível sem conteúdo vira erro só naquele nível', () => {
    const { levels } = convertResponse('QUIZ', { title: 'T', easy: quizLevel(2), normal: { questions: [] } }, { fallbackTitle: 'x', seed: 1 });
    expect(levels.map((l) => l.config !== null)).toEqual([true, false, false]);
    expect(levels[1].error).toBeTruthy();
  });

  it('usa o título da página quando o modelo não manda título', () => {
    expect(convertResponse('QUIZ', { easy: quizLevel(2) }, { fallbackTitle: 'Página X', seed: 1 }).title).toBe('Página X');
  });

  it('lê JSON cercado por ``` ou com texto em volta', () => {
    expect(parseModelJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseModelJson('Aqui está: {"a":2} pronto')).toEqual({ a: 2 });
    expect(parseModelJson('nada')).toBeNull();
  });

  it('monta o pedido com o material, os três níveis e as instruções do professor', () => {
    const [system, user] = buildMessages('FORCA', { title: 'Aula', url: 'https://x.gitbook.io/aula', text: 'CONTEÚDO' }, 'foco em hardware');
    expect(system.role).toBe('system');
    expect(user.content).toContain('CONTEÚDO');
    expect(user.content).toContain('"easy"');
    expect(user.content).toContain('foco em hardware');
    expect(user.content).toMatch(/hard \(Difícil\)/);
  });
});
