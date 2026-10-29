// Validação e limpeza do conteúdo de uma atividade (documento do editor Tiptap, em JSON).
//
// O servidor NÃO confia no que o navegador envia: reconstrói o documento só com os nós e marcas
// permitidos, aceita apenas links/imagens http(s), exige blockId único em cada jogo e valida a
// configuração de cada jogo com o mesmo código que o aluno vai usar (@playground/games/validate).
import { isGameType, maxScoreFor, validateGameConfig } from '@playground/games/validate';
import { availableLevels, validateLevels, type LevelConfigs } from '@playground/games/adaptive';

export const MAX_GAMES = 20;
export const MAX_NODES = 5000;
export const MAX_DEPTH = 8;
export const MAX_TEXT = 20_000;
const MAX_URL = 2000;
const BLOCK_ID = /^[A-Za-z0-9_-]{8,64}$/;

export interface GameInfo {
  blockId: string;
  gameType: string;
  config: unknown;
  maxScore: number;
  levels?: LevelConfigs; // jogo adaptativo: uma config por nível (config = a do Normal)
}

export type ContentResult = { ok: true; content: DocNode; games: GameInfo[] } | { ok: false; error: string };

export interface DocNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}

export const EMPTY_DOC: DocNode = { type: 'doc', content: [{ type: 'paragraph' }] };

class Invalid extends Error {}
const fail = (msg: string): never => {
  throw new Invalid(msg);
};

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

function safeUrl(raw: unknown, allowMailto: boolean): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (s === '' || s.length > MAX_URL) return null;
  try {
    const u = new URL(s);
    if (u.protocol === 'http:' || u.protocol === 'https:') return s;
    if (allowMailto && u.protocol === 'mailto:') return s;
  } catch {
    /* URL inválida */
  }
  return null;
}

const BLOCK_CHILDREN = new Set(['paragraph', 'heading', 'bulletList', 'orderedList', 'image']);

export function validateContent(raw: unknown): ContentResult {
  const games: GameInfo[] = [];
  const seen = new Set<string>();
  let count = 0;

  const cleanMarks = (marks: unknown) => {
    if (marks === undefined) return undefined;
    if (!Array.isArray(marks)) return fail('Formatação inválida.');
    const out: NonNullable<DocNode['marks']> = [];
    for (const m of marks) {
      if (!isObj(m)) return fail('Formatação inválida.');
      if (m.type === 'bold' || m.type === 'italic' || m.type === 'code') {
        out.push({ type: m.type });
      } else if (m.type === 'link') {
        const href = safeUrl(isObj(m.attrs) ? m.attrs.href : null, true);
        if (!href) return fail('Há um link inválido (use endereços http:// ou https://).');
        out.push({ type: 'link', attrs: { href } });
      } else {
        return fail(`Formatação não permitida: ${String(m.type)}.`);
      }
    }
    return out.length > 0 ? out : undefined;
  };

  const cleanInline = (n: unknown): DocNode => {
    if (!isObj(n)) return fail('Conteúdo inválido.');
    if (n.type === 'hardBreak') return { type: 'hardBreak' };
    if (n.type !== 'text' || typeof n.text !== 'string') return fail('Conteúdo inválido dentro de um parágrafo.');
    if (n.text.length > MAX_TEXT) return fail('Um trecho de texto é grande demais.');
    const marks = cleanMarks(n.marks);
    return { type: 'text', text: n.text, ...(marks ? { marks } : {}) };
  };

  const node = (n: unknown, depth: number, top: boolean): DocNode => {
    if (!isObj(n) || typeof n.type !== 'string') return fail('Conteúdo inválido.');
    if (depth > MAX_DEPTH) return fail('Listas aninhadas demais.');
    if (++count > MAX_NODES) return fail('Documento grande demais.');
    const kids = (): unknown[] => {
      if (n.content === undefined) return [];
      return Array.isArray(n.content) ? n.content : fail('Conteúdo inválido.');
    };

    switch (n.type) {
      case 'paragraph':
        return { type: 'paragraph', ...(kids().length ? { content: kids().map((k) => cleanInline(k)) } : {}) };

      case 'heading': {
        const level = isObj(n.attrs) ? n.attrs.level : undefined;
        if (!Number.isInteger(level) || (level as number) < 1 || (level as number) > 4)
          return fail('Os títulos vão de H1 a H4.');
        return {
          type: 'heading',
          attrs: { level },
          ...(kids().length ? { content: kids().map((k) => cleanInline(k)) } : {}),
        };
      }

      case 'bulletList':
      case 'orderedList': {
        const items = kids();
        if (items.length === 0) return fail('Lista vazia.');
        return { type: n.type, content: items.map((i) => node(i, depth + 1, false)) };
      }

      case 'listItem': {
        const items = kids();
        if (items.length === 0) return fail('Item de lista vazio.');
        return {
          type: 'listItem',
          content: items.map((c) => {
            const t = isObj(c) ? c.type : null;
            if (t !== 'paragraph' && t !== 'bulletList' && t !== 'orderedList') return fail('Item de lista inválido.');
            return node(c, depth + 1, false);
          }),
        };
      }

      case 'image': {
        const a = isObj(n.attrs) ? n.attrs : {};
        const src = safeUrl(a.src, false);
        if (!src) return fail('Há uma imagem com endereço inválido (use http:// ou https://).');
        const alt = typeof a.alt === 'string' ? a.alt.slice(0, 300) : null;
        return { type: 'image', attrs: { src, ...(alt ? { alt } : {}) } };
      }

      case 'gameBlock': {
        if (!top) return fail('Os jogos ficam no nível principal do texto, fora de listas.');
        const a = isObj(n.attrs) ? n.attrs : {};
        const blockId = a.blockId;
        if (typeof blockId !== 'string' || !BLOCK_ID.test(blockId)) return fail('Jogo sem identificador válido.');
        if (seen.has(blockId)) return fail('Dois jogos com o mesmo identificador.');
        seen.add(blockId);
        if (!isGameType(a.gameType)) return fail('Tipo de jogo desconhecido.');
        if (games.length >= MAX_GAMES) return fail(`No máximo ${MAX_GAMES} jogos por atividade.`);
        if (a.levels !== undefined && a.levels !== null) {
          // jogo adaptativo: 2 ou 3 níveis; `config` passa a ser a do Normal (ou o mais próximo)
          const levels = validateLevels(a.gameType, a.levels);
          if (!levels) return fail(`O jogo ${games.length + 1} precisa de pelo menos 2 níveis válidos.`);
          const config = levels.normal ?? levels[availableLevels(levels)[0]];
          const max = maxScoreFor(a.gameType, config);
          if (max === null) return fail(`A configuração do jogo ${games.length + 1} é inválida.`);
          games.push({ blockId, gameType: a.gameType, config, maxScore: max, levels });
          return { type: 'gameBlock', attrs: { blockId, gameType: a.gameType, config, levels } };
        }
        const config = validateGameConfig(a.gameType, a.config);
        if (config === null) return fail(`A configuração do jogo ${games.length + 1} é inválida.`);
        const max = maxScoreFor(a.gameType, config);
        if (max === null) return fail(`A configuração do jogo ${games.length + 1} é inválida.`);
        games.push({ blockId, gameType: a.gameType, config, maxScore: max });
        return { type: 'gameBlock', attrs: { blockId, gameType: a.gameType, config } };
      }

      default:
        return fail(`Elemento não permitido: ${n.type}.`);
    }
  };

  try {
    if (!isObj(raw) || raw.type !== 'doc') return { ok: false, error: 'Conteúdo inválido.' };
    const children = raw.content === undefined ? [] : raw.content;
    if (!Array.isArray(children)) return { ok: false, error: 'Conteúdo inválido.' };
    const content = children.map((c) => {
      if (isObj(c) && c.type !== 'gameBlock' && !BLOCK_CHILDREN.has(String(c.type)))
        return fail(`Elemento não permitido: ${String(c.type)}.`);
      return node(c, 1, true);
    });
    return { ok: true, content: { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }, games };
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: e.message };
    throw e;
  }
}

// Jogos de um conteúdo já salvo (sem revalidar)
export interface StoredGame {
  blockId: string;
  gameType: string;
  config: unknown;
  levels?: LevelConfigs; // jogo adaptativo
}

export function gamesIn(content: unknown): StoredGame[] {
  if (!isObj(content) || !Array.isArray(content.content)) return [];
  return content.content
    .filter((n): n is Record<string, unknown> => isObj(n) && n.type === 'gameBlock' && isObj(n.attrs))
    .map((n) => {
      const a = n.attrs as Record<string, unknown>;
      const levels = isObj(a.levels) ? (a.levels as LevelConfigs) : undefined;
      return { blockId: String(a.blockId), gameType: String(a.gameType), config: a.config, ...(levels ? { levels } : {}) };
    });
}

// Comparação estrutural simples (JSON)
export const sameJson = (a: unknown, b: unknown): boolean => {
  const canon = (x: unknown): unknown =>
    Array.isArray(x)
      ? x.map(canon)
      : isObj(x)
        ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])]))
        : x;
  return JSON.stringify(canon(a)) === JSON.stringify(canon(b));
};

