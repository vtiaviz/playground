import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { hashPassword } from '../src/auth/password';
import { signToken } from '../src/auth/token';
import { prisma } from '../src/prisma';

const app = createApp();
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

// Forca em três níveis (máximo 750 em todos: 5 palavras × 150)
const easy = { title: 'Natureza — Fácil', theme: '', words: ['sol', 'lua', 'mar', 'rio', 'céu'] };
const normal = { title: 'Natureza — Normal', theme: '', words: ['nuvem', 'chuva', 'vento', 'terra', 'pedra'] };
const hard = { title: 'Natureza — Difícil', theme: '', words: ['fotossíntese', 'ecossistema', 'biodiversidade', 'atmosfera', 'evaporação'] };
const adaptive = (blockId: string, levels: Record<string, unknown> = { easy, normal, hard }) => ({
  type: 'gameBlock',
  attrs: { blockId, gameType: 'FORCA', config: normal, levels },
});
const doc = (...blocks: unknown[]) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Aula' }] }, ...blocks] });

// 5 palavras acertadas rápido (desempenho 100) ou todas perdidas devagar (desempenho 0)
const great = { items: Array.from({ length: 5 }, () => ({ correct: 1, seconds: 4, errors: 0 })) };
const poor = { items: Array.from({ length: 5 }, () => ({ correct: 0, seconds: 30, errors: 6 })) };
const good = { items: Array.from({ length: 5 }, () => ({ correct: 0.9, seconds: 20, errors: 1 })) }; // ~82

let tokenInstr = '';
let tokenOther = '';
let tokenAna = '';
let ana = '';
let teamId = '';

async function wipe() {
  await prisma.activity.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
}

beforeEach(async () => {
  await wipe();
  const hash = await hashPassword('Senha1234');
  const mk = (name: string, login: string, role: 'INSTRUCTOR' | 'STUDENT') =>
    prisma.user.create({ data: { name, login, passwordHash: hash, role } });
  const instr = await mk('Instrutora', 'i@escola.com', 'INSTRUCTOR');
  const other = await mk('Outro', 'o@escola.com', 'INSTRUCTOR');
  const a = await mk('Ana', 'ana', 'STUDENT');
  tokenInstr = signToken(instr);
  tokenOther = signToken(other);
  tokenAna = signToken(a);
  ana = a.id;
  const t = await prisma.team.create({ data: { name: 'Turma 1', instructorId: instr.id } });
  teamId = t.id;
  await prisma.teamStudent.create({ data: { teamId, studentId: a.id } });
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

const view = async (id: string) => {
  const r = await request(app).get(`/api/student/activities/${id}`).set(auth(tokenAna));
  expect(r.status).toBe(200);
  const blocks = (r.body.activity.content.content as { type: string; attrs: Record<string, unknown> }[]).filter((n) => n.type === 'gameBlock');
  return { body: r.body, blocks: Object.fromEntries(blocks.map((b) => [b.attrs.blockId as string, b.attrs])) };
};
const start = (id: string, blockId: string) =>
  request(app).post(`/api/student/activities/${id}/start`).set(auth(tokenAna)).send({ blockId });
const play = (id: string, blockId: string, details: object, score = 300) =>
  request(app).post(`/api/student/activities/${id}/scores`).set(auth(tokenAna)).send({ blockId, score, maxScore: 750, details });

describe('jogo adaptativo na atividade', () => {
  it('valida os níveis: pelo menos 2 e todos válidos', async () => {
    const bad1 = await request(app).post('/api/activities').set(auth(tokenInstr)).send({ title: 'X', content: doc(adaptive('bloco-0001', { normal })) });
    expect(bad1.status).toBe(400);
    expect(bad1.body.error).toMatch(/2 níveis/);
    const bad2 = await request(app)
      .post('/api/activities')
      .set(auth(tokenInstr))
      .send({ title: 'X', content: doc(adaptive('bloco-0001', { normal, hard: { words: ['x'] } })) });
    expect(bad2.status).toBe(400);
    const ok = await request(app).post('/api/activities').set(auth(tokenInstr)).send({ title: 'X', content: doc(adaptive('bloco-0001', { easy, hard })) });
    expect(ok.status).toBe(201);
    const block = ok.body.activity.content.content[1];
    expect(Object.keys(block.attrs.levels).sort()).toEqual(['easy', 'hard']);
    expect(block.attrs.config.title).toBe('Natureza — Fácil'); // sem Normal: config = nível mais fácil disponível
  });

  it('o aluno recebe só a config do nível dele (começa no Normal)', async () => {
    const id = await publish(doc(adaptive('bloco-0001')));
    const { blocks, body } = await view(id);
    expect(blocks['bloco-0001']).toMatchObject({ adaptive: true, level: 'normal', levelCount: 3, config: { title: 'Natureza — Normal' } });
    expect(blocks['bloco-0001'].levels).toBeUndefined(); // os outros níveis ficam no servidor
    expect(body.activity.maxScore).toBe(750);
  });

  it('desempenho excelente sobe o nível e atualiza o próximo jogo ainda não começado', async () => {
    const id = await publish(doc(adaptive('bloco-0001'), adaptive('bloco-0002'), adaptive('bloco-0003')));
    expect((await start(id, 'bloco-0001')).body.game).toMatchObject({ level: 'normal' });
    expect((await start(id, 'bloco-0003')).body.game).toMatchObject({ level: 'normal' }); // começou: nível travado

    const r = await play(id, 'bloco-0001', great, 700);
    expect(r.status).toBe(201);
    expect(r.body.performance).toMatchObject({ score: 100, accuracy: 100, basis: 'items' });
    expect(r.body.level).toMatchObject({ played: 'normal', before: 'normal', after: 'hard', change: 'up' });
    expect(r.body.updatedGames).toEqual([{ blockId: 'bloco-0002', level: 'hard', config: expect.objectContaining({ title: 'Natureza — Difícil' }) }]);

    const { blocks, body } = await view(id);
    expect(blocks['bloco-0001'].level).toBe('normal'); // jogado no Normal
    expect(blocks['bloco-0002'].level).toBe('hard');
    expect(blocks['bloco-0003'].level).toBe('normal'); // travado no "Começar"
    expect(body.scores[0]).toMatchObject({ level: 'normal', performance: 100 });

    const saved = await prisma.gameScore.findFirstOrThrow({ where: { blockId: 'bloco-0001' } });
    expect(saved.metrics).toMatchObject({ score: 100, items: 5 });
  });

  it('dois bons seguidos sobem; desempenho muito baixo desce na hora', async () => {
    const id = await publish(doc(adaptive('bloco-0001'), adaptive('bloco-0002'), adaptive('bloco-0003')));
    const a = await play(id, 'bloco-0001', good);
    expect(a.body.performance.score).toBeGreaterThanOrEqual(80);
    expect(a.body.performance.score).toBeLessThan(90);
    expect(a.body.level).toMatchObject({ after: 'normal', change: null });
    const b = await play(id, 'bloco-0002', good);
    expect(b.body.level).toMatchObject({ before: 'normal', after: 'hard', change: 'up' });
    const c = await play(id, 'bloco-0003', poor, 0);
    expect(c.body.performance.score).toBe(0);
    expect(c.body.level).toMatchObject({ played: 'hard', after: 'normal', change: 'down' });
  });

  it('confere a nota contra a config do nível do aluno', async () => {
    const id = await publish(doc(adaptive('bloco-0001')));
    const r = await request(app)
      .post(`/api/student/activities/${id}/scores`)
      .set(auth(tokenAna))
      .send({ blockId: 'bloco-0001', score: 10, maxScore: 999 });
    expect(r.status).toBe(400);
  });

  it('jogo fixo também guarda o desempenho, mas não mexe no nível', async () => {
    const id = await publish(doc({ type: 'gameBlock', attrs: { blockId: 'bloco-0001', gameType: 'FORCA', config: easy } }));
    const r = await play(id, 'bloco-0001', great, 700);
    expect(r.status).toBe(201);
    expect(r.body.performance.score).toBe(100);
    expect(r.body.level).toBeNull();
    expect(await prisma.studentLevel.count()).toBe(0);
  });

  it('jogo adaptativo com notas não pode ter os níveis alterados', async () => {
    const id = await publish(doc(adaptive('bloco-0001')));
    await play(id, 'bloco-0001', great);
    const r = await request(app)
      .patch(`/api/activities/${id}`)
      .set(auth(tokenInstr))
      .send({ content: doc(adaptive('bloco-0001', { easy: normal, normal, hard })) });
    expect(r.status).toBe(409);
  });

  it('"Começar" depois de concluído é recusado', async () => {
    const id = await publish(doc(adaptive('bloco-0001')));
    await play(id, 'bloco-0001', great);
    expect((await start(id, 'bloco-0001')).status).toBe(409);
    expect((await start(id, 'nao-existe')).status).toBe(404);
  });
});

describe('painel de níveis do instrutor', () => {
  it('matriz, ficha com histórico e ajuste manual com bloqueio', async () => {
    const id = await publish(doc(adaptive('bloco-0001'), adaptive('bloco-0002')));
    await play(id, 'bloco-0001', great, 700);

    const m = await request(app).get('/api/levels').set(auth(tokenInstr));
    expect(m.status).toBe(200);
    expect(m.body.students[0]).toMatchObject({ name: 'Ana', teams: ['Turma 1'] });
    expect(m.body.students[0].games.FORCA).toMatchObject({ level: 'hard', games: 1, lastPerformance: 100 });
    expect(m.body.students[0].games.QUIZ).toMatchObject({ level: null, startsAt: 'hard' }); // média dos outros jogos
    expect(m.body.distribution.find((d: { gameType: string }) => d.gameType === 'FORCA')).toMatchObject({ hard: 1, none: 0 });

    // fixa no Fácil: o próximo jogo vem no Fácil e não sobe mesmo com desempenho 100
    const put = await request(app).put(`/api/levels/students/${ana}/FORCA`).set(auth(tokenInstr)).send({ level: 'easy', locked: true });
    expect(put.status).toBe(200);
    expect(put.body.level).toMatchObject({ level: 'easy', locked: true });
    expect((await view(id)).blocks['bloco-0002'].level).toBe('easy');
    const r = await play(id, 'bloco-0002', great, 700);
    expect(r.body.level).toMatchObject({ after: 'easy', change: null, locked: true });

    const f = await request(app).get(`/api/levels/students/${ana}`).set(auth(tokenInstr));
    expect(f.status).toBe(200);
    expect(f.body.games.find((g: { gameType: string }) => g.gameType === 'FORCA')).toMatchObject({ level: 'easy', locked: true, games: 2 });
    expect(f.body.events.map((e: { source: string }) => e.source)).toEqual(['GAME', 'INSTRUCTOR', 'GAME']);
    expect(f.body.events[1].reason).toMatch(/ajustado pelo instrutor; nível fixado/i);
    expect(f.body.plays[0]).toMatchObject({ activity: 'Aula', level: 'easy', performance: 100 });

    // dashboard da atividade mostra nível e desempenho
    const d = await request(app).get(`/api/dashboard/activities/${id}`).set(auth(tokenInstr));
    expect(d.body.games[0]).toMatchObject({ adaptive: true, levelCount: 3, title: 'Natureza', byLevel: { normal: 1 }, avgPerformance: 100 });
    expect(d.body.students[0]).toMatchObject({ avgPerformance: 100 });
  });

  it('valida entrada e não deixa outro instrutor ver ou mexer', async () => {
    expect((await request(app).put(`/api/levels/students/${ana}/FORCA`).set(auth(tokenInstr)).send({})).status).toBe(400);
    expect((await request(app).put(`/api/levels/students/${ana}/XADREZ`).set(auth(tokenInstr)).send({ level: 'easy' })).status).toBe(400);
    expect((await request(app).put(`/api/levels/students/${ana}/FORCA`).set(auth(tokenInstr)).send({ level: 'master' })).status).toBe(400);
    expect((await request(app).get(`/api/levels/students/${ana}`).set(auth(tokenOther))).status).toBe(404);
    expect((await request(app).put(`/api/levels/students/${ana}/FORCA`).set(auth(tokenOther)).send({ level: 'easy' })).status).toBe(404);
    expect((await request(app).get('/api/levels').set(auth(tokenOther))).body.students).toEqual([]);
    expect((await request(app).get('/api/levels').set(auth(tokenAna))).status).toBe(403);
  });
});
