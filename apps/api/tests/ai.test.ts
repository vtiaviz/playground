import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// DNS falso: tudo resolve para um IP público, menos o host "interno"
vi.mock('node:dns/promises', () => ({
  lookup: async (host: string) => [{ address: host === 'interno.exemplo.com' ? '10.0.0.5' : '93.184.216.34', family: 4 }],
}));

import { createApp } from '../src/app';
import { config } from '../src/config';
import { hashPassword } from '../src/auth/password';
import { signToken } from '../src/auth/token';
import { prisma } from '../src/prisma';
import { isPrivateIp, scrape } from '../src/ai/scrape';

const app = createApp();
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

const LOREM = 'Um roteador encaminha pacotes entre redes diferentes usando o endereço IP de destino. '.repeat(8);
const MD = `# Redes de computadores\n\n${LOREM}\n\n![img](x.png) Veja [o switch](https://x/y).\n`;
const HTML = `<!doctype html><html><head><title>Redes | Meu GitBook</title><script>var x=1</script></head><body>
<nav><a href="/curso/redes/switch">Switch</a><a href="/curso/redes/roteador">Roteador</a><a href="/outro">Outro</a></nav>
<main><h1>Redes de computadores</h1><p>${LOREM}</p><ul><li>LAN</li><li>WAN</li></ul></main><footer>rodapé</footer></body></html>`;

type Route = (url: string) => Response | undefined;
const page = (body: string, type: string, status = 200) => new Response(body, { status, headers: { 'content-type': type } });

const quizLevel = (n: number) => ({
  questions: Array.from({ length: n }, (_, i) => ({ text: `Pergunta ${i + 1}?`, options: ['certa', 'errada', 'outra'], correct: 0 })),
});
const MODEL_JSON = JSON.stringify({ title: 'Redes', easy: quizLevel(5), normal: quizLevel(8), hard: quizLevel(10) });
const llmOk = (content = MODEL_JSON) => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });

let llmCalls: { url: string; body: Record<string, unknown> }[] = [];
function mockFetch(site: Route, llm: () => Response = () => llmOk()) {
  llmCalls = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = input.toString();
    if (url.startsWith(config.ai.baseUrl)) {
      llmCalls.push({ url, body: JSON.parse(String(init?.body)) });
      return llm();
    }
    return site(url) ?? page('não achei', 'text/html', 404);
  });
}

let token = '';
let student = '';

beforeEach(async () => {
  config.ai.apiKey = 'chave-de-teste';
  await prisma.activity.deleteMany();
  await prisma.user.deleteMany();
  const hash = await hashPassword('Senha1234');
  token = signToken(await prisma.user.create({ data: { name: 'I', login: 'i@x.com', passwordHash: hash, role: 'INSTRUCTOR' } }));
  student = signToken(await prisma.user.create({ data: { name: 'A', login: 'a', passwordHash: hash, role: 'STUDENT' } }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('scraping', () => {
  it('usa o Markdown do GitBook (.md) quando existe', async () => {
    mockFetch((u) => (u === 'https://x.gitbook.io/curso/redes.md' ? page(MD, 'text/markdown; charset=utf-8') : undefined));
    const r = await scrape('https://x.gitbook.io/curso/redes', { maxChars: 5000 });
    expect(r.title).toBe('Redes de computadores');
    expect(r.text).toContain('roteador encaminha');
    expect(r.text).not.toContain('x.png');
    expect(r.text).toContain('Veja o switch.');
  });

  it('sem .md, extrai só o conteúdo principal do HTML', async () => {
    mockFetch((u) => (u === 'https://site.com/curso/redes' ? page(HTML, 'text/html') : undefined));
    const r = await scrape('https://site.com/curso/redes', { maxChars: 5000 });
    expect(r.title).toBe('Redes de computadores');
    expect(r.text).toContain('- LAN');
    expect(r.text).not.toMatch(/rodapé|var x|Outro/);
  });

  it('corta o texto no limite de caracteres', async () => {
    mockFetch((u) => (u === 'https://site.com/curso/redes' ? page(HTML, 'text/html') : undefined));
    const r = await scrape('https://site.com/curso/redes', { maxChars: 400 });
    expect(r.text.length).toBeLessThanOrEqual(400);
    expect(r.truncated).toBe(true);
  });

  it('recusa endereços internos, inclusive por redirecionamento', async () => {
    expect(isPrivateIp('127.0.0.1')).toBe(true);
    expect(isPrivateIp('192.168.0.10')).toBe(true);
    expect(isPrivateIp('::ffff:10.1.1.1')).toBe(true);
    expect(isPrivateIp('8.8.8.8')).toBe(false);
    mockFetch((u) =>
      u.startsWith('https://site.com/') ? new Response(null, { status: 302, headers: { location: 'http://interno.exemplo.com/admin' } }) : undefined,
    );
    await expect(scrape('http://localhost:3333/api', { maxChars: 5000 })).rejects.toThrow(/porta|público/);
    await expect(scrape('https://interno.exemplo.com/x', { maxChars: 5000 })).rejects.toThrow('não é público');
    await expect(scrape('https://site.com/x', { maxChars: 5000 })).rejects.toThrow('não é público');
    await expect(scrape('file:///etc/passwd', { maxChars: 5000 })).rejects.toThrow('http');
  });

  it('explica página privada e página sem texto', async () => {
    mockFetch((u) => (u.includes('privada') ? page('login', 'text/html', 403) : page('<html><body><main><p>oi</p></main></body></html>', 'text/html')));
    await expect(scrape('https://site.com/privada', { maxChars: 5000 })).rejects.toThrow('privada');
    await expect(scrape('https://site.com/vazia', { maxChars: 5000 })).rejects.toThrow('pouco texto');
  });
});

describe('POST /api/ai/generate', () => {
  const site: Route = (u) => (u === 'https://x.gitbook.io/redes.md' ? page(MD, 'text/markdown') : undefined);
  const gen = (body: object, t = token) => request(app).post('/api/ai/generate').set(auth(t)).send(body);

  it('exige instrutor', async () => {
    expect((await request(app).post('/api/ai/generate').send({})).status).toBe(401);
    expect((await gen({ gameType: 'QUIZ', url: 'https://x.gitbook.io/redes' }, student)).status).toBe(403);
  });

  it('avisa quando a chave não está configurada', async () => {
    config.ai.apiKey = '';
    const res = await gen({ gameType: 'QUIZ', url: 'https://x.gitbook.io/redes' });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('AI_DISABLED');
    expect((await request(app).get('/api/ai/status').set(auth(token))).body.enabled).toBe(false);
  });

  it('link -> scraping -> modelo -> três níveis prontos para salvar', async () => {
    mockFetch(site);
    const res = await gen({ gameType: 'QUIZ', url: 'https://x.gitbook.io/redes', instructions: 'foco em roteadores' });
    expect(res.status).toBe(200);
    expect(res.body.levels.map((l: { level: string }) => l.level)).toEqual(['easy', 'normal', 'hard']);
    expect(res.body.levels.map((l: { config: { questions: unknown[] } }) => l.config.questions.length)).toEqual([5, 8, 10]);
    expect(res.body.levels[0].title).toBe('Redes — Fácil');
    expect(res.body.source.title).toBe('Redes de computadores');

    // um pedido só, em modo JSON, com o material e as instruções
    expect(llmCalls).toHaveLength(1);
    expect(llmCalls[0].url).toBe(`${config.ai.baseUrl}/chat/completions`);
    expect(llmCalls[0].body.response_format).toEqual({ type: 'json_object' });
    expect(llmCalls[0].body.model).toBe(config.ai.model);
    expect(llmCalls[0].body.max_tokens).toBe(config.ai.maxOutputTokens);
    const prompt = JSON.stringify(llmCalls[0].body.messages);
    expect(prompt).toContain('roteador encaminha');
    expect(prompt).toContain('foco em roteadores');

    // os três salvos de uma vez na biblioteca
    const saved = await request(app)
      .post('/api/games/batch')
      .set(auth(token))
      .send({ games: res.body.levels.map((l: { config: unknown }) => ({ gameType: 'QUIZ', config: l.config })) });
    expect(saved.status).toBe(201);
    expect(saved.body.games.map((g: { title: string }) => g.title)).toEqual(['Redes — Fácil', 'Redes — Normal', 'Redes — Difícil']);
  });

  it('tenta de novo uma vez quando o modelo responde fora do formato', async () => {
    let n = 0;
    mockFetch(site, () => (n++ === 0 ? llmOk('não é json') : llmOk()));
    const res = await gen({ gameType: 'QUIZ', url: 'https://x.gitbook.io/redes' });
    expect(res.status).toBe(200);
    expect(llmCalls).toHaveLength(2);
  });

  it('repassa erros do provedor com mensagem clara', async () => {
    mockFetch(site, () => new Response('{}', { status: 429, headers: { 'retry-after': '30' } }));
    const r429 = await gen({ gameType: 'QUIZ', url: 'https://x.gitbook.io/redes' });
    expect(r429.status).toBe(429);
    expect(r429.body.error).toContain('30s');

    mockFetch(site, () => new Response('{}', { status: 401 }));
    expect((await gen({ gameType: 'QUIZ', url: 'https://x.gitbook.io/redes' })).body.error).toContain('AI_API_KEY');

    // resposta real do Groq para modelo descontinuado
    mockFetch(site, () =>
      new Response(JSON.stringify({ error: { message: 'The model `llama-3.3-70b-versatile` does not exist or you do not have access to it.', code: 'model_not_found' } }), { status: 404 }),
    );
    const r404 = await gen({ gameType: 'QUIZ', url: 'https://x.gitbook.io/redes' });
    expect(r404.status).toBe(502);
    expect(r404.body.error).toContain('AI_MODEL');

    mockFetch(site, () =>
      new Response(JSON.stringify({ error: { message: 'Request too large for model on tokens per minute (TPM): Limit 8000, Requested 9500' } }), { status: 413 }),
    );
    expect((await gen({ gameType: 'QUIZ', url: 'https://x.gitbook.io/redes' })).body.error).toContain('AI_MAX_SOURCE_CHARS');
  });

  it('valida a entrada', async () => {
    expect((await gen({ gameType: 'XADREZ', url: 'https://x.gitbook.io/redes' })).status).toBe(400);
    expect((await gen({ gameType: 'QUIZ', url: '' })).status).toBe(400);
    mockFetch(site);
    expect((await gen({ gameType: 'QUIZ', url: 'ftp://x.com/a' })).status).toBe(400);
  });
});

describe('POST /api/games/batch', () => {
  it('salva tudo ou nada', async () => {
    const ok = { gameType: 'FORCA', config: { title: 'F', theme: '', words: ['sol', 'lua', 'mar', 'rio', 'céu'] } };
    const bad = { gameType: 'FORCA', config: { title: 'F', words: ['x'] } };
    const res = await request(app).post('/api/games/batch').set(auth(token)).send({ games: [ok, bad] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('O jogo 2 é inválido');
    expect(await prisma.savedGame.count()).toBe(0);
  });
});
