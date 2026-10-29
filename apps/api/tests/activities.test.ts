import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { hashPassword } from '../src/auth/password';
import { signToken } from '../src/auth/token';
import { prisma } from '../src/prisma';

const app = createApp();
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

let tokenA = '';
let tokenB = '';
let tokenStudent = '';
let studentId = '';
let teamA1 = '';
let teamA2 = '';
let teamB = '';

const forca = {
  title: 'Forca',
  theme: 'Natureza',
  words: ['sol', 'lua', 'mar', 'rio', 'céu'],
};
const game = (blockId: string, config: unknown = forca) => ({
  type: 'gameBlock',
  attrs: { blockId, gameType: 'FORCA', config },
});
const doc = (...content: unknown[]) => ({ type: 'doc', content });
const p = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });

async function wipe() {
  await prisma.activity.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
}

beforeEach(async () => {
  await wipe();
  const hash = await hashPassword('Senha1234');
  const mk = (name: string, login: string, role: 'INSTRUCTOR' | 'STUDENT') =>
    prisma.user.create({ data: { name, login, passwordHash: hash, role, mustChangePassword: false } });
  const a = await mk('Instrutora A', 'a@escola.com', 'INSTRUCTOR');
  const b = await mk('Instrutor B', 'b@escola.com', 'INSTRUCTOR');
  const s = await mk('Aluno', 'aluno', 'STUDENT');
  tokenA = signToken(a);
  tokenB = signToken(b);
  tokenStudent = signToken(s);
  studentId = s.id;
  teamA1 = (await prisma.team.create({ data: { name: 'A1', instructorId: a.id } })).id;
  teamA2 = (await prisma.team.create({ data: { name: 'A2', instructorId: a.id } })).id;
  teamB = (await prisma.team.create({ data: { name: 'B1', instructorId: b.id } })).id;
});

afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

const create = async (token: string, body: Record<string, unknown> = { title: 'Aula 1' }) => {
  const res = await request(app).post('/api/activities').set(auth(token)).send(body);
  expect(res.status).toBe(201);
  return res.body.activity as { id: string; title: string; status: string; content: any; gameCount: number };
};

describe('acesso', () => {
  it('exige login e perfil de instrutor', async () => {
    expect((await request(app).get('/api/activities')).status).toBe(401);
    expect((await request(app).get('/api/activities').set(auth(tokenStudent))).status).toBe(403);
  });
});

describe('CRUD', () => {
  it('cria rascunho com documento vazio, lista, lê e renomeia', async () => {
    const a = await create(tokenA);
    expect(a.status).toBe('DRAFT');
    expect(a.content.type).toBe('doc');

    const list = await request(app).get('/api/activities').set(auth(tokenA));
    expect(list.body.activities).toHaveLength(1);
    expect(list.body.activities[0].gameCount).toBe(0);

    const upd = await request(app).patch(`/api/activities/${a.id}`).set(auth(tokenA)).send({ title: 'Aula 1 (v2)' });
    expect(upd.status).toBe(200);
    expect(upd.body.activity.title).toBe('Aula 1 (v2)');
  });

  it('exige título', async () => {
    const res = await request(app).post('/api/activities').set(auth(tokenA)).send({ title: '   ' });
    expect(res.status).toBe(400);
  });

  it('salva texto e jogos; a configuração do jogo volta normalizada', async () => {
    const a = await create(tokenA);
    const content = doc(
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Título' }] },
      p('Texto'),
      game('bloco-0001', { ...forca, extra: 'lixo' }),
    );
    const res = await request(app).patch(`/api/activities/${a.id}`).set(auth(tokenA)).send({ content });
    expect(res.status).toBe(200);
    expect(res.body.activity.gameCount).toBe(1);
    const saved = res.body.activity.content.content[2];
    expect(saved.attrs.blockId).toBe('bloco-0001');
    expect(saved.attrs.config.extra).toBeUndefined();
  });

  it('um instrutor não enxerga nem mexe nas atividades de outro', async () => {
    const a = await create(tokenA);
    expect((await request(app).get(`/api/activities/${a.id}`).set(auth(tokenB))).status).toBe(404);
    expect((await request(app).patch(`/api/activities/${a.id}`).set(auth(tokenB)).send({ title: 'x' })).status).toBe(404);
    expect((await request(app).delete(`/api/activities/${a.id}`).set(auth(tokenB))).status).toBe(404);
    expect((await request(app).get('/api/activities').set(auth(tokenB))).body.activities).toHaveLength(0);
  });

  it('exclui', async () => {
    const a = await create(tokenA);
    expect((await request(app).delete(`/api/activities/${a.id}`).set(auth(tokenA))).status).toBe(204);
    expect(await prisma.activity.count()).toBe(0);
  });
});

describe('validação do conteúdo', () => {
  const save = async (content: unknown) => {
    const a = await create(tokenA);
    return request(app).patch(`/api/activities/${a.id}`).set(auth(tokenA)).send({ content });
  };

  it('recusa elementos não permitidos (script, html cru)', async () => {
    expect((await save(doc({ type: 'script', content: [] }))).status).toBe(400);
    expect((await save(doc({ type: 'html', text: '<img onerror=x>' }))).status).toBe(400);
  });

  it('recusa links e imagens que não sejam http(s)', async () => {
    const link = (href: string) =>
      doc({ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href } }] }] });
    expect((await save(link('javascript:alert(1)'))).status).toBe(400);
    expect((await save(link('https://kahoot.it'))).status).toBe(200);
    expect((await save(doc({ type: 'image', attrs: { src: 'data:image/png;base64,AAAA' } }))).status).toBe(400);
    expect((await save(doc({ type: 'image', attrs: { src: 'https://exemplo.com/a.png', alt: 'a' } }))).status).toBe(200);
  });

  it('títulos só de H1 a H4', async () => {
    expect((await save(doc({ type: 'heading', attrs: { level: 5 }, content: [] }))).status).toBe(400);
    expect((await save(doc({ type: 'heading', attrs: { level: 4 }, content: [{ type: 'text', text: 'ok' }] }))).status).toBe(200);
  });

  it('jogo: blockId obrigatório e único, tipo e configuração válidos', async () => {
    expect((await save(doc(game('curto')))).status).toBe(400);
    expect((await save(doc(game('bloco-0001'), game('bloco-0001')))).status).toBe(400);
    expect((await save(doc({ type: 'gameBlock', attrs: { blockId: 'bloco-0001', gameType: 'XADREZ', config: {} } }))).status).toBe(400);
    expect((await save(doc(game('bloco-0001', { title: 'x', words: ['a'] })))).status).toBe(400);
    expect((await save(doc(game('bloco-0001'), game('bloco-0002')))).status).toBe(200);
  });

  it('jogo dentro de lista é recusado', async () => {
    const res = await save(
      doc({ type: 'bulletList', content: [{ type: 'listItem', content: [game('bloco-0001')] }] }),
    );
    expect(res.status).toBe(400);
  });
});

describe('publicação', () => {
  it('publica em várias turmas, atualiza as turmas e volta para rascunho', async () => {
    const a = await create(tokenA);
    const pub = await request(app).post(`/api/activities/${a.id}/publish`).set(auth(tokenA)).send({ teamIds: [teamA1, teamA2] });
    expect(pub.status).toBe(200);
    expect(pub.body.activity.status).toBe('PUBLISHED');
    expect(pub.body.activity.teams.map((t: { name: string }) => t.name)).toEqual(['A1', 'A2']);

    const again = await request(app).post(`/api/activities/${a.id}/publish`).set(auth(tokenA)).send({ teamIds: [teamA2] });
    expect(again.body.activity.teams).toHaveLength(1);
    expect(await prisma.activityTeam.count()).toBe(1);

    const un = await request(app).post(`/api/activities/${a.id}/unpublish`).set(auth(tokenA));
    expect(un.body.activity.status).toBe('DRAFT');
  });

  it('exige ao menos uma turma e só aceita turmas do próprio instrutor', async () => {
    const a = await create(tokenA);
    expect((await request(app).post(`/api/activities/${a.id}/publish`).set(auth(tokenA)).send({ teamIds: [] })).status).toBe(400);
    expect((await request(app).post(`/api/activities/${a.id}/publish`).set(auth(tokenA)).send({ teamIds: [teamB] })).status).toBe(400);
    expect((await request(app).get(`/api/activities/${a.id}`).set(auth(tokenA))).body.activity.status).toBe('DRAFT');
  });

  it('aceita prazo', async () => {
    const a = await create(tokenA);
    const res = await request(app)
      .post(`/api/activities/${a.id}/publish`)
      .set(auth(tokenA))
      .send({ teamIds: [teamA1], dueAt: '2030-01-01T12:00:00.000Z' });
    expect(res.body.activity.dueAt).toBe('2030-01-01T12:00:00.000Z');
  });

  it('excluir a turma não apaga a atividade', async () => {
    const a = await create(tokenA);
    await request(app).post(`/api/activities/${a.id}/publish`).set(auth(tokenA)).send({ teamIds: [teamA1] });
    await request(app).delete(`/api/teams/${teamA1}`).set(auth(tokenA));
    expect(await prisma.activity.count()).toBe(1);
  });
});

describe('jogos que já têm notas', () => {
  it('não podem ser removidos nem alterados; os demais podem', async () => {
    const a = await create(tokenA);
    await request(app)
      .patch(`/api/activities/${a.id}`)
      .set(auth(tokenA))
      .send({ content: doc(game('bloco-0001'), game('bloco-0002')) });
    await prisma.gameScore.create({
      data: { studentId, activityId: a.id, blockId: 'bloco-0001', gameType: 'FORCA', score: 500, maxScore: 750 },
    });

    const remove = await request(app).patch(`/api/activities/${a.id}`).set(auth(tokenA)).send({ content: doc(game('bloco-0002')) });
    expect(remove.status).toBe(409);

    const change = await request(app)
      .patch(`/api/activities/${a.id}`)
      .set(auth(tokenA))
      .send({ content: doc(game('bloco-0001', { ...forca, words: ['sol', 'lua', 'mar', 'rio', 'pau'] }), game('bloco-0002')) });
    expect(change.status).toBe(409);

    const ok = await request(app)
      .patch(`/api/activities/${a.id}`)
      .set(auth(tokenA))
      .send({ content: doc(p('novo texto'), game('bloco-0001'), game('bloco-0003')) });
    expect(ok.status).toBe(200);
    expect(ok.body.activity.hasScores).toBe(true);
  });
});
