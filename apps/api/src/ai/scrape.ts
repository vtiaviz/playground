// link -> scraping -> texto limpo. Pensado para GitBook, mas funciona com páginas HTML comuns.
//
// GitBook publica a versão em Markdown de cada página acrescentando ".md" ao endereço
// (https://gitbook.com/docs/getting-started/llm-ready-docs). Tentamos isso primeiro; se não vier
// Markdown, lemos o HTML e ficamos só com o conteúdo principal (sem menus, rodapé, scripts).
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { load, type CheerioAPI } from 'cheerio';

export class ScrapeError extends Error {
  constructor(
    message: string,
    public status = 422,
  ) {
    super(message);
  }
}

export interface ScrapedPage {
  url: string;
  title: string;
  text: string;
}

export interface ScrapeResult {
  title: string;
  url: string;
  text: string; // já cortado em maxChars
  truncated: boolean;
}

export interface ScrapeDeps {
  fetch: typeof fetch;
  // Resolve o host em IPs; usado para barrar endereços internos (SSRF)
  resolve: (host: string) => Promise<string[]>;
}

const defaultDeps: ScrapeDeps = {
  fetch: (...a) => fetch(...a),
  resolve: async (host) => (await lookup(host, { all: true })).map((r) => r.address),
};

const TIMEOUT_MS = 15_000;
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_REDIRECTS = 4;
const UA = 'PlaygroundBot/1.0 (+gerador de atividades educativas)';

// ---------- segurança: só http(s) público ----------

export function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith('::ffff:')) return isPrivateIp(v6.slice(7));
  return v6 === '::' || v6 === '::1' || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6) || v6.startsWith('ff');
}

export function parsePublicUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new ScrapeError('Endereço inválido. Use um link completo, como https://seu-espaco.gitbook.io/pagina', 400);
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new ScrapeError('Use um link http:// ou https://', 400);
  if (u.username || u.password) throw new ScrapeError('O link não pode ter usuário e senha.', 400);
  if (u.port && u.port !== '80' && u.port !== '443') throw new ScrapeError('O link não pode usar uma porta diferente de 80 ou 443.', 400);
  u.hash = '';
  return u;
}

async function assertPublicHost(u: URL, deps: ScrapeDeps) {
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal'))
    throw new ScrapeError('Esse endereço não é público.', 400);
  let ips: string[];
  try {
    ips = isIP(host) ? [host] : await deps.resolve(host);
  } catch {
    throw new ScrapeError(`Não encontrei o site "${host}". Confira o link.`);
  }
  if (ips.length === 0 || ips.some(isPrivateIp)) throw new ScrapeError('Esse endereço não é público.', 400);
}

// fetch com limite de tempo e de tamanho, seguindo redirecionamentos um a um (cada destino é checado)
async function get(url: URL, deps: ScrapeDeps): Promise<{ url: URL; status: number; type: string; body: string }> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(current, deps);
    let res: Response;
    try {
      res = await deps.fetch(current, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'User-Agent': UA, Accept: 'text/markdown, text/html;q=0.9, text/plain;q=0.8' },
      });
    } catch {
      throw new ScrapeError('Não consegui abrir o link (o site não respondeu a tempo).');
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) break;
      current = parsePublicUrl(new URL(loc, current).toString());
      continue;
    }
    const type = (res.headers.get('content-type') ?? '').toLowerCase();
    const len = Number(res.headers.get('content-length') ?? 0);
    if (len > MAX_BYTES) throw new ScrapeError('A página é grande demais para ler.');
    const body = res.ok ? await readLimited(res) : '';
    return { url: current, status: res.status, type, body };
  }
  throw new ScrapeError('O link redireciona vezes demais.');
}

async function readLimited(res: Response): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new ScrapeError('A página é grande demais para ler.');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

// ---------- extração ----------

const clean = (s: string) =>
  s
    .replace(/\r/g, '')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const looksLikeHtml = (s: string) => /^\s*(<!doctype html|<html|<head|<body)/i.test(s);

// Markdown do GitBook -> texto: tira imagens, links (fica o texto), blocos {% %} e HTML solto
export function markdownToText(md: string): { title: string; text: string } {
  const title = /^#\s+(.+)$/m.exec(md)?.[1]?.trim() ?? '';
  const text = md
    .replace(/^---\n[\s\S]*?\n---\n/, '') // front matter
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\{%[^%]*%\}/g, '')
    .replace(/<\/?[a-z][^>]*>/gi, '');
  return { title, text: clean(text) };
}

const BLOCKS = 'h1,h2,h3,h4,h5,h6,p,li,pre,blockquote,td,th,dt,dd,figcaption';
const NOISE =
  'script,style,noscript,template,svg,iframe,nav,header,footer,aside,form,button,[role=navigation],[role=banner],[role=contentinfo],[aria-hidden=true],[hidden]';

export function htmlToText($: CheerioAPI): { title: string; text: string } {
  $(NOISE).remove();
  const root = [$('main article'), $('main'), $('article'), $('[role=main]'), $('body')].find((r) => r.length > 0) ?? $('body');
  const title = clean(root.find('h1').first().text()) || clean($('title').first().text()).replace(/\s*[|–-].*$/, '');
  const lines: string[] = [];
  root.find(BLOCKS).each((_, el) => {
    const $el = $(el);
    // pula blocos que contêm outros blocos (o texto sai pelos filhos)
    if (el.tagName !== 'pre' && $el.find(BLOCKS).length > 0) return;
    const t = el.tagName === 'pre' ? $el.text().trim() : clean($el.text());
    if (!t) return;
    const tag = el.tagName;
    if (/^h[1-6]$/.test(tag)) lines.push(`\n${'#'.repeat(Number(tag[1]))} ${t}`);
    else if (tag === 'li') lines.push(`- ${t}`);
    else if (tag === 'pre') lines.push('```\n' + t + '\n```');
    else lines.push(t);
  });
  const text = lines.length ? lines.join('\n') : root.text();
  return { title, text: clean(text) };
}

const mdUrl = (u: URL) => {
  const m = new URL(u);
  m.search = '';
  m.pathname = m.pathname.replace(/\/+$/, '') + '.md';
  return m;
};

// Lê a página do link: tenta o .md do GitBook e cai para o HTML
async function readPage(url: URL, deps: ScrapeDeps): Promise<ScrapedPage> {
  if (url.pathname.replace(/\/+$/, '') !== '' && !/\.md$/i.test(url.pathname)) {
    const md = await get(mdUrl(url), deps).catch(() => null);
    if (md && md.status === 200 && md.body.trim() && !md.type.includes('html') && !looksLikeHtml(md.body)) {
      const { title, text } = markdownToText(md.body);
      if (text.length > 80) return { url: url.toString(), title, text };
    }
  }
  const res = await get(url, deps);
  if (res.status === 401 || res.status === 403) throw new ScrapeError('A página é privada (pede login). Publique o espaço do GitBook ou use um link público.');
  if (res.status === 404) throw new ScrapeError('Página não encontrada (erro 404). Confira o link.');
  if (res.status !== 200) throw new ScrapeError(`O site respondeu com erro ${res.status}.`);
  if (res.type && !/(html|text\/plain|markdown)/.test(res.type)) throw new ScrapeError('O link não é uma página de texto (HTML ou Markdown).');
  const extracted = !res.type.includes('html') && !looksLikeHtml(res.body) ? markdownToText(res.body) : htmlToText(load(res.body));
  return { url: res.url.toString(), ...extracted };
}

// Só a página do link (sem subpáginas). O texto é cortado em maxChars, num fim de linha.
export async function scrape(rawUrl: string, opts: { maxChars: number }, deps: ScrapeDeps = defaultDeps): Promise<ScrapeResult> {
  const url = parsePublicUrl(rawUrl);
  const page = await readPage(url, deps);
  let text = page.text;
  const truncated = text.length > opts.maxChars;
  if (truncated) {
    const cut = text.lastIndexOf('\n', opts.maxChars);
    text = text.slice(0, cut > opts.maxChars / 2 ? cut : opts.maxChars).trim();
  }
  if (text.length < 200) throw new ScrapeError('Encontrei pouco texto nessa página para gerar um jogo. Tente outra página.');
  return { title: page.title || url.hostname, url: page.url, text, truncated };
}
