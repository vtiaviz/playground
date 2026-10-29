import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { hashPassword } from '../src/auth/password';
import { signToken } from '../src/auth/token';
import { prisma } from '../src/prisma';

const app = createApp();
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

const forca = { title: 'Forca', theme: 'Natureza', words: ['sol', 'lua', 'mar', 'rio', 'céu'] }; // máximo 750
const game = (blockId: string) => ({ type: 'gameBlock', attrs: { blockId, gameType: 'FORCA', config: forca } });
const para = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });

let tokenInstr = '';
let tokenS1 = '';
let tokenS2 = '';
let tokenOutsider = '';
let tokenPending = '';
let s1 = '';
let s2 = '';
let activityId = '';
let draftId = '';
let otherTeamActivityId = '';

async function wipe() {
  await prisma.activity.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
}

beforeEach(async () => {
  await wipe();
  const hash = await hashPassword('Senha1234');
  const mk = (name: string, login: string, role: 'INSTRUCTOR' | 'STUDENT', mustChangePassword = false) =>
    prisma.user.create({ data: { name, login, passwordHash: hash, role, mustChangePassword } });

  const instr = await mk('Instrutora', 'i@escola.com', 'INSTRUCTOR');
  const a = await mk('Ana', 'ana', 'STUDENT');
  const b = await mk('Bruno', 'bruno', 'STUDENT');
  const out = await mk('Fora da turma', 'fora', 'STUDENT');
  const pend = await mk('Pendente', 'pendente', 'STUDENT', true);
  tokenInstr = signToken(instr);
  tokenS1 = signToken(a);
  tokenS2 = signToken(b);
  tokenOutsider = signToken(out);
  tokenPending = signToken(pend);
  s1 = a.id;
  s2 = b.id;

  const t1 = await prisma.team.create({ data: { name: 'Turma 1', instructorId: instr.id } });
  const t2 = await prisma.team.create({ data: { name: 'Turma 2', instructorId: instr.id } });
  await prisma.teamStudent.createMany({
    data: [
      { teamId: t1.id, studentId: a.id },
      { teamId: t1.id, studentId: b.id },
      { teamId: t2.id, studentId: out.id },
      { teamId: t1.id, studentId: pend.id },
    ],
  });

  const mkActivity = async (title: string, content: unknown, published: boolean, teamId?: string) => {
    const act = await prisma.activity.create({
      data: {
        title,
        contentJson: content as object,
        instructorId: instr.id,
        publishedAt: published ? new Date() : null,
        ...(teamId ? { teams: { create: [{ teamId }] } } : {}),
      },
    });
    return act.id;
  };
  const content = { type: 'doc', content: [para('Leia'), game('bloco-0001'), game('bloco-0002')] };
  activityId = await mkActivity('Aula 1', content, true, t1.id);
  draftId = await mkActivity('Rascunho', content, false, t1.id);
  otherTeamActivityId = await mkActivity('Outra turma', content, true, t2.id);
});

afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

const play = (token: string, id: string, blockId: string, score: number, extra: Record<string, unknown> = {}) =>
  request(app).post(`/api/student/activities/${id}/scores`).set(auth(token)).send({ blockId, score, ...extra });

describe('acesso', () => {
  it('exige login, perfil de aluno e senha já trocada', async () => {
    expect((await request(app).get('/api/student/activities')).status).toBe(401);
    expect((await request(app).get('/api/student/activities').set(auth(tokenInstr))).status).toBe(403);
    expect((await request(app).get('/api/student/activities').set(auth(tokenPending))).status).toBe(403);
  });
});

describe('lista e leitura', () => {
  it('mostra só atividades publicadas para as turmas do aluno', async () => {
    const res = await request(app).get('/api/student/activities').set(auth(tokenS1));
    expect(res.status).toBe(200);
    expect(res.body.activities).toHaveLength(1);
    const a = res.body.activities[0];
    expect(a).toMatchObject({ id: activityId, title: 'Aula 1', gameCount: 2, playedCount: 0, score: 0, maxScore: 1500, done: false });

    expect((await request(app).get('/api/student/activities').set(auth(tokenOutsider))).body.activities.map((x: { title: string }) => x.title)).toEqual(['Outra turma']);
  });

  it('abre a atividade com o conteúdo; rascunho e atividade de outra turma não existem para o aluno', async () => {
    const ok = await request(app).get(`/api/student/activities/${activityId}`).set(auth(tokenS1));
    expect(ok.status).toBe(200);
    expect(ok.body.activity.content.content).toHaveLength(3);
    expect(ok.body.scores).toEqual([]);
    expect(ok.body.feedback).toBeNull();

    expect((await request(app).get(`/api/student/activities/${draftId}`).set(auth(tokenS1))).status).toBe(404);
    expect((await request(app).get(`/api/student/activities/${otherTeamActivityId}`).set(auth(tokenS1))).status).toBe(404);
    expect((await request(app).get(`/api/student/activities/${activityId}`).set(auth(tokenOutsider))).status).toBe(404);
  });
});

describe('registro de pontos', () => {
  it('grava a nota, usa o máximo do servidor e conclui a atividade com o último jogo', async () => {
    const r1 = await play(tokenS1, activityId, 'bloco-0001', 547, { maxScore: 750, durationSeconds: 80, details: { stars: 2 } });
    expect(r1.status).toBe(201);
    expect(r1.body.score).toMatchObject({ score: 547, maxScore: 750 });

    let list = (await request(app).get('/api/student/activities').set(auth(tokenS1))).body.activities[0];
    expect(list).toMatchObject({ playedCount: 1, score: 547, done: false });

    expect((await play(tokenS1, activityId, 'bloco-0002', 750)).status).toBe(201);
    list = (await request(app).get('/api/student/activities').set(auth(tokenS1))).body.activities[0];
    expect(list).toMatchObject({ playedCount: 2, score: 1297, done: true });

    const detail = await request(app).get(`/api/student/activities/${activityId}`).set(auth(tokenS1));
    expect(detail.body.scores).toHaveLength(2);
  });

  it('só vale a primeira vez (409) e não altera a nota guardada', async () => {
    await play(tokenS1, activityId, 'bloco-0001', 300);
    const again = await play(tokenS1, activityId, 'bloco-0001', 750);
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('ALREADY_PLAYED');
    expect(await prisma.gameScore.count({ where: { studentId: s1 } })).toBe(1);
    expect((await prisma.gameScore.findFirstOrThrow({ where: { studentId: s1 } })).score).toBe(300);
  });

  it('recusa nota impossível, máximo divergente, jogo inexistente e valores inválidos', async () => {
    expect((await play(tokenS1, activityId, 'bloco-0001', 751)).status).toBe(400);
    expect((await play(tokenS1, activityId, 'bloco-0001', 100, { maxScore: 9999 })).status).toBe(400);
    expect((await play(tokenS1, activityId, 'nao-existe', 100)).status).toBe(404);
    expect((await play(tokenS1, activityId, 'bloco-0001', -1)).status).toBe(400);
    expect((await play(tokenS1, activityId, 'bloco-0001', 10.5)).status).toBe(400);
    expect(await prisma.gameScore.count()).toBe(0);
  });

  it('não grava em rascunho nem em atividade de outra turma', async () => {
    expect((await play(tokenS1, draftId, 'bloco-0001', 100)).status).toBe(404);
    expect((await play(tokenS1, otherTeamActivityId, 'bloco-0001', 100)).status).toBe(404);
    expect((await play(tokenOutsider, activityId, 'bloco-0001', 100)).status).toBe(404);
  });
});

describe('feedback', () => {
  const rate = (token: string, rating: unknown, comment?: string) =>
    request(app).put(`/api/student/activities/${activityId}/feedback`).set(auth(token)).send({ rating, comment });

  it('só depois de terminar os jogos; valida a nota; pode ser ajustado', async () => {
    expect((await rate(tokenS1, 5)).status).toBe(409);

    await play(tokenS1, activityId, 'bloco-0001', 100);
    await play(tokenS1, activityId, 'bloco-0002', 100);

    expect((await rate(tokenS1, 0)).status).toBe(400);
    expect((await rate(tokenS1, 6)).status).toBe(400);
    expect((await rate(tokenS1, 4.5)).status).toBe(400);

    const ok = await rate(tokenS1, 4, '  Gostei  ');
    expect(ok.status).toBe(200);
    expect(ok.body.feedback).toEqual({ rating: 4, comment: 'Gostei' });

    expect((await rate(tokenS1, 5)).body.feedback.rating).toBe(5);
    expect(await prisma.feedback.count()).toBe(1);

    const detail = await request(app).get(`/api/student/activities/${activityId}`).set(auth(tokenS1));
    expect(detail.body.feedback).toEqual({ rating: 5, comment: null });
    expect(detail.body.activity.feedbackGiven).toBe(true);
  });
});

describe('ranking', () => {
  it('ordena por pontos, empata na mesma posição e marca o próprio aluno', async () => {
    await play(tokenS1, activityId, 'bloco-0001', 500);
    await play(tokenS1, activityId, 'bloco-0002', 100);
    await play(tokenS2, activityId, 'bloco-0001', 600);

    const res = await request(app).get('/api/student/ranking').set(auth(tokenS1));
    expect(res.status).toBe(200);
    expect(res.body.teams).toHaveLength(1);
    const rows = res.body.teams[0].ranking as { rank: number; name: string; total: number; isMe: boolean }[];
    expect(rows.map((r) => [r.name, r.total, r.rank])).toEqual([
      ['Ana', 600, 1],
      ['Bruno', 600, 1], // empate
      ['Pendente', 0, 3],
    ]);
    expect(rows.find((r) => r.isMe)?.name).toBe('Ana');
    expect(res.body.me).toMatchObject({ name: 'Ana', total: 600 });
    expect(res.body.general).toHaveLength(3);
  });

  it('não mistura turmas: quem está só na Turma 2 não aparece para a Turma 1', async () => {
    await play(tokenOutsider, otherTeamActivityId, 'bloco-0001', 700);
    const res = await request(app).get('/api/student/ranking').set(auth(tokenS1));
    expect(res.body.general.some((r: { name: string }) => r.name === 'Fora da turma')).toBe(false);
    expect(res.body.teams[0].ranking.every((r: { total: number }) => r.total === 0)).toBe(true);
  });

  it('atividade despublicada deixa de contar no ranking', async () => {
    await play(tokenS1, activityId, 'bloco-0001', 500);
    await prisma.activity.update({ where: { id: activityId }, data: { publishedAt: null } });
    const res = await request(app).get('/api/student/ranking').set(auth(tokenS1));
    expect(res.body.me.total).toBe(0);
  });
});
