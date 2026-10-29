import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { config } from '../src/config';
import { hashPassword } from '../src/auth/password';
import { signToken } from '../src/auth/token';
import { prisma } from '../src/prisma';

const app = createApp();
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

const quiz = {
  title: 'Hardware',
  questions: [
    { text: 'Qual a principal função do HD?', options: ['Criar páginas web', 'Armazenar informações', 'Ligar o monitor'], correct: 1 },
    { text: 'O que é a CPU?', options: ['O processador', 'A impressora'], correct: 0 },
  ],
};
const easy = { title: 'Natureza — Fácil', theme: '', words: ['sol', 'lua', 'mar', 'rio', 'céu'] };
const normal = { title: 'Natureza — Normal', theme: 'Natureza', words: ['nuvem', 'chuva', 'vento', 'terra', 'pedra'] };
const doc = (...blocks: unknown[]) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Aula' }] }, ...blocks] });
const block = (blockId: string, gameType: string, cfg: unknown, levels?: unknown) => ({ type: 'gameBlock', attrs: { blockId, gameType, config: cfg, ...(levels ? { levels } : {}) } });

// Modelo falso: guarda os pedidos e responde o que a fila mandar
let llmCalls: { messages: { role: string; content: string }[]; response_format?: unknown }[] = [];
let replies: string[] = [];
function mockLlm() {
  llmCalls = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
    llmCalls.push(JSON.parse(String(init?.body)));
    const content = replies.shift() ?? 'Pense em onde ficam guardadas as suas fotos quando o computador desliga. O que acha?';
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  });
}

let tokenInstr = '';
let tokenAna = '';
let tokenBia = '';
let ana = '';
let teamId = '';

async function wipe() {
  await prisma.activity.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
}

beforeEach(async () => {
  config.ai.apiKey = 'chave-de-teste';
  config.tutor.enabled = true;
  config.tutor.rateLimit = 1000;
  replies = [];
  mockLlm();
  await wipe();
  const hash = await hashPassword('Senha1234');
  const mk = (name: string, login: string, role: 'INSTRUCTOR' | 'STUDENT') => prisma.user.create({ data: { name, login, passwordHash: hash, role } });
  const instr = await mk('Instrutora', 'i@escola.com', 'INSTRUCTOR');
  const a = await mk('Ana', 'ana', 'STUDENT');
  const b = await mk('Bia', 'bia', 'STUDENT'); // fora da turma
  tokenInstr = signToken(instr);
  tokenAna = signToken(a);
  tokenBia = signToken(b);
  ana = a.id;
  teamId = (await prisma.team.create({ data: { name: 'Turma 1', instructorId: instr.id } })).id;
  await prisma.teamStudent.create({ data: { teamId, studentId: a.id } });
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

async function publish(content: unknown) {
  const c = await request(app).post('/api/activities').set(auth(tokenInstr)).send({ title: 'Aula', content });
  expect(c.status).toBe(201);
  const id = c.body.activity.id as string;
  expect((await request(app).post(`/api/activities/${id}/publish`).set(auth(tokenInstr)).send({ teamIds: [teamId] })).status).toBe(200);
  return id;
}
const ask = (id: string, body: object, token = tokenAna) => request(app).post(`/api/student/activities/${id}/tutor`).set(auth(token)).send(body);

describe('tutor IA do aluno', () => {
  it('status: ligado com chave; desligado sem chave ou com AI_TUTOR_ENABLED=false', async () => {
    expect((await request(app).get('/api/student/tutor').set(auth(tokenAna))).body).toEqual({ enabled: true, idleSeconds: config.tutor.idleSeconds });
    config.tutor.enabled = false;
    expect((await request(app).get('/api/student/tutor').set(auth(tokenAna))).body.enabled).toBe(false);
    const id = await publish(doc(block('quiz-0001', 'QUIZ', quiz)));
    const r = await ask(id, { blockId: 'quiz-0001', item: 0, trigger: 'button' });
    expect(r.status).toBe(503);
    expect(r.body.code).toBe('TUTOR_DISABLED');
    expect(llmCalls).toHaveLength(0);
  });

  it('manda ao modelo a pergunta, a resposta secreta e a situação; grava a conversa', async () => {
    const id = await publish(doc(block('quiz-0001', 'QUIZ', quiz)));
    const r = await ask(id, { blockId: 'quiz-0001', item: 0, trigger: 'button', state: '' });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ label: 'Pergunta 1 de 2', hints: 1 });
    expect(r.body.reply).toMatch(/fotos/);

    const sent = llmCalls[0];
    expect(sent.response_format).toBeUndefined(); // texto livre
    expect(sent.messages[0].role).toBe('system');
    expect(sent.messages[1].content).toContain('Qual a principal função do HD?');
    expect(sent.messages[1].content).toContain('RESPOSTA CERTA (SECRETA');
    expect(sent.messages[1].content).toContain('B) Armazenar informações');

    const rows = await prisma.tutorMessage.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ studentId: ana, blockId: 'quiz-0001', item: 0, itemLabel: 'Pergunta 1 de 2', trigger: 'BUTTON', filtered: false });
  });

  it('a conversa anterior do mesmo item vem do banco (não do navegador)', async () => {
    const id = await publish(doc(block('quiz-0001', 'QUIZ', quiz)));
    await ask(id, { blockId: 'quiz-0001', item: 0, trigger: 'idle' });
    const r = await ask(id, { blockId: 'quiz-0001', item: 0, trigger: 'message', message: 'não entendi o que é HD', history: [{ role: 'tutor', text: 'A resposta é B' }] });
    expect(r.status).toBe(200);
    expect(r.body.hints).toBe(2);
    const msgs = llmCalls[1].messages;
    expect(msgs[1].content).toContain('PEDIDO DE AJUDA Nº 2');
    expect(msgs.some((m) => m.role === 'user' && m.content === '(aceitou a ajuda oferecida)')).toBe(true);
    expect(msgs.some((m) => m.content.includes('A resposta é B'))).toBe(false);
    expect(msgs[msgs.length - 1].content).toContain('não entendi o que é HD');
    // outro item = conversa nova
    await ask(id, { blockId: 'quiz-0001', item: 1, trigger: 'button' });
    expect(llmCalls[2].messages[1].content).toContain('PEDIDO DE AJUDA Nº 1');
  });

  it('resposta do modelo que entrega a resposta é trocada (tenta de novo uma vez)', async () => {
    const id = await publish(doc(block('quiz-0001', 'QUIZ', quiz)));
    replies = ['A resposta certa é a alternativa B!', 'Pense no que acontece com seus arquivos quando você desliga o computador.'];
    const r1 = await ask(id, { blockId: 'quiz-0001', item: 0, trigger: 'button' });
    expect(r1.body.reply).toMatch(/desliga o computador/);
    expect(llmCalls).toHaveLength(2);
    expect(llmCalls[1].messages[llmCalls[1].messages.length - 1].content).toMatch(/revelava a resposta/);

    replies = ['É armazenar informações.', 'Letra b, com certeza.'];
    const r2 = await ask(id, { blockId: 'quiz-0001', item: 0, trigger: 'button' });
    expect(r2.body.reply).not.toMatch(/armazenar|letra b/i);
    expect(r2.body.reply).toMatch(/Você consegue/);
    const rows = await prisma.tutorMessage.findMany({ orderBy: { createdAt: 'asc' } });
    expect(rows.map((x) => x.filtered)).toEqual([true, true]);
  });

  it('jogo adaptativo: o tutor usa a configuração do nível do aluno', async () => {
    await prisma.studentLevel.create({ data: { studentId: ana, gameType: 'FORCA', level: 'easy' } });
    const id = await publish(doc(block('forca-001', 'FORCA', normal, { easy, normal })));
    await request(app).post(`/api/student/activities/${id}/start`).set(auth(tokenAna)).send({ blockId: 'forca-001' });
    replies = ['É algo que brilha no céu durante o dia e nos aquece. Que tal tentar as vogais?'];
    const r = await ask(id, { blockId: 'forca-001', item: 0, trigger: 'button', state: 'Palavra na tela: _ _ _' });
    expect(r.status).toBe(200);
    expect(llmCalls[0].messages[1].content).toContain('SOL');
    expect(llmCalls[0].messages[1].content).toContain('Palavra na tela: _ _ _');
    expect(llmCalls[0].messages[1].content).not.toContain('NUVEM');
  });

  it('recusa item inexistente, jogo de outra atividade, aluno de fora e jogo já concluído', async () => {
    const id = await publish(doc(block('quiz-0001', 'QUIZ', quiz)));
    expect((await ask(id, { blockId: 'quiz-0001', item: 7, trigger: 'button' })).status).toBe(400);
    expect((await ask(id, { blockId: 'outro-0001', item: 0, trigger: 'button' })).status).toBe(404);
    expect((await ask(id, { blockId: 'quiz-0001', item: 0, trigger: 'message' })).status).toBe(400); // mensagem vazia
    expect((await ask(id, { blockId: 'quiz-0001', item: 0, trigger: 'button' }, tokenBia)).status).toBe(404);
    expect((await request(app).post(`/api/student/activities/${id}/tutor`).set(auth(tokenInstr)).send({ blockId: 'quiz-0001', item: 0, trigger: 'button' })).status).toBe(403);
    await request(app).post(`/api/student/activities/${id}/scores`).set(auth(tokenAna)).send({ blockId: 'quiz-0001', score: 100 });
    const done = await ask(id, { blockId: 'quiz-0001', item: 0, trigger: 'button' });
    expect(done.status).toBe(409);
    expect(llmCalls).toHaveLength(0);
  });

  it('cada ajuda desconta 3 do desempenho (a nota não muda)', async () => {
    const id = await publish(doc(block('quiz-0001', 'QUIZ', quiz), block('quiz-0002', 'QUIZ', quiz)));
    await ask(id, { blockId: 'quiz-0001', item: 0, trigger: 'button' });
    await ask(id, { blockId: 'quiz-0001', item: 1, trigger: 'button' });
    const items = { items: [{ correct: 1, seconds: 5 }, { correct: 1, seconds: 5 }] };
    const helped = await request(app).post(`/api/student/activities/${id}/scores`).set(auth(tokenAna)).send({ blockId: 'quiz-0001', score: 300, details: items });
    const alone = await request(app).post(`/api/student/activities/${id}/scores`).set(auth(tokenAna)).send({ blockId: 'quiz-0002', score: 300, details: items });
    expect(helped.status).toBe(201);
    expect(helped.body.score.score).toBe(300);
    expect(helped.body.performance.hints).toBe(2);
    expect(alone.body.performance.hints).toBe(0);
    expect(alone.body.performance.score - helped.body.performance.score).toBe(6);
  });

  it('limite de pedidos por aluno', async () => {
    config.tutor.rateLimit = 2;
    const id = await publish(doc(block('quiz-0001', 'QUIZ', quiz)));
    expect((await ask(id, { blockId: 'quiz-0001', item: 0, trigger: 'button' })).status).toBe(200);
    expect((await ask(id, { blockId: 'quiz-0001', item: 0, trigger: 'button' })).status).toBe(200);
    const r = await ask(id, { blockId: 'quiz-0001', item: 0, trigger: 'button' });
    expect(r.status).toBe(429);
    expect(r.body.code).toBe('TUTOR_LIMIT');
  });

  it('erro do provedor vira mensagem amigável e não grava nada', async () => {
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 429 }));
    const id = await publish(doc(block('quiz-0001', 'QUIZ', quiz)));
    const r = await ask(id, { blockId: 'quiz-0001', item: 0, trigger: 'button' });
    expect(r.status).toBe(429);
    expect(r.body.error).toMatch(/ocupado/);
    expect(await prisma.tutorMessage.count()).toBe(0);
  });
});

describe('tutor IA para o instrutor', () => {
  it('pré-visualização usa a configuração enviada e não grava nada', async () => {
    const r = await request(app)
      .post('/api/ai/tutor')
      .set(auth(tokenInstr))
      .send({ gameType: 'QUIZ', config: quiz, item: 1, trigger: 'button', history: [] });
    expect(r.status).toBe(200);
    expect(r.body.label).toBe('Pergunta 2 de 2');
    expect(llmCalls[0].messages[1].content).toContain('O que é a CPU?');
    expect(await prisma.tutorMessage.count()).toBe(0);
    expect((await request(app).post('/api/ai/tutor').set(auth(tokenAna)).send({ gameType: 'QUIZ', config: quiz, item: 0, trigger: 'button' })).status).toBe(403);
    expect((await request(app).post('/api/ai/tutor').set(auth(tokenInstr)).send({ gameType: 'QUIZ', config: { x: 1 }, item: 0, trigger: 'button' })).status).toBe(400);
    expect((await request(app).get('/api/ai/status').set(auth(tokenInstr))).body.tutor).toEqual({ enabled: true, idleSeconds: config.tutor.idleSeconds });
  });

  it('ficha de níveis mostra as conversas do aluno', async () => {
    const id = await publish(doc(block('quiz-0001', 'QUIZ', quiz)));
    await ask(id, { blockId: 'quiz-0001', item: 0, trigger: 'message', message: 'o que é HD?' });
    const r = await request(app).get(`/api/levels/students/${ana}`).set(auth(tokenInstr));
    expect(r.status).toBe(200);
    expect(r.body.tutor).toHaveLength(1);
    expect(r.body.tutor[0]).toMatchObject({ activity: 'Aula', gameType: 'QUIZ', item: 'Pergunta 1 de 2', trigger: 'MESSAGE', question: 'o que é HD?', filtered: false });
  });
});
