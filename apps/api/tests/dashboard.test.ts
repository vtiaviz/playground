import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { hashPassword } from '../src/auth/password';
import { signToken } from '../src/auth/token';
import { prisma } from '../src/prisma';
import { buildAssignments, buildOverview } from '../src/lib/dashboard';

const app = createApp();
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

const forca = { title: 'Forca', theme: 'Natureza', words: ['sol', 'lua', 'mar', 'rio', 'céu'] }; // máx. 750
const game = (blockId: string) => ({ type: 'gameBlock', attrs: { blockId, gameType: 'FORCA', config: forca } });

let tokenA = '';
let tokenB = '';
let tokenStudent = '';
let ids = { ana: '', bruno: '', carla: '', t1: '', t2: '', act: '', draft: '' };

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
  const ana = await mk('Ana', 'ana', 'STUDENT');
  const bruno = await mk('Bruno', 'bruno', 'STUDENT');
  const carla = await mk('Carla', 'carla', 'STUDENT');
  tokenA = signToken(a);
  tokenB = signToken(b);
  tokenStudent = signToken(ana);

  const t1 = await prisma.team.create({ data: { name: 'Turma 1', instructorId: a.id } });
  const t2 = await prisma.team.create({ data: { name: 'Turma 2', instructorId: a.id } });
  await prisma.teamStudent.createMany({
    data: [
      { teamId: t1.id, studentId: ana.id },
      { teamId: t1.id, studentId: bruno.id },
      { teamId: t1.id, studentId: carla.id },
      { teamId: t2.id, studentId: carla.id }, // Carla está nas duas turmas
    ],
  });

  const content = { type: 'doc', content: [game('bloco-0001'), game('bloco-0002')] };
  const act = await prisma.activity.create({
    data: { title: 'Aula 1', contentJson: content, instructorId: a.id, publishedAt: new Date(), teams: { create: [{ teamId: t1.id }, { teamId: t2.id }] } },
  });
  const draft = await prisma.activity.create({ data: { title: 'Rascunho', contentJson: content, instructorId: a.id } });

  const sc = (studentId: string, blockId: string, score: number) =>
    prisma.gameScore.create({ data: { studentId, activityId: act.id, blockId, gameType: 'FORCA', score, maxScore: 750 } });
  await sc(ana.id, 'bloco-0001', 750);
  await sc(ana.id, 'bloco-0002', 375); // Ana concluiu: 1125 / 1500
  await sc(bruno.id, 'bloco-0001', 300); // Bruno em andamento
  await prisma.feedback.create({ data: { studentId: ana.id, activityId: act.id, rating: 5, comment: 'Ótima!' } });
  await prisma.feedback.create({ data: { studentId: bruno.id, activityId: act.id, rating: 3 } }); // avaliou sem terminar: conta na nota

  ids = { ana: ana.id, bruno: bruno.id, carla: carla.id, t1: t1.id, t2: t2.id, act: act.id, draft: draft.id };
});

afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

const overview = async (token = tokenA, query = '') => request(app).get(`/api/dashboard${query}`).set(auth(token));

describe('acesso', () => {
  it('exige login e perfil de instrutor', async () => {
    expect((await request(app).get('/api/dashboard')).status).toBe(401);
    expect((await overview(tokenStudent)).status).toBe(403);
  });
});

describe('visão geral', () => {
  it('conta entregas uma vez por aluno e atividade (Carla está em duas turmas)', async () => {
    const res = await overview();
    expect(res.status).toBe(200);
    const o = res.body.overview;
    expect(o.kpis).toMatchObject({ students: 3, activities: 1, deliveries: 3, pending: 1 });
    expect(o.kpis.completionPct).toBe(33.3); // 1 de 3
    // acertos: (750+375+300) / (3 × 750)
    expect(o.kpis.avgScorePct).toBe(63.3);
    expect(o.kpis.avgRating).toBe(4);
    expect(o.kpis.ratingCount).toBe(2);
  });

  it('desempenho por atividade, turma e jogo', async () => {
    const o = (await overview()).body.overview;
    expect(o.activities[0]).toMatchObject({ title: 'Aula 1', total: 3, done: 1, inProgress: 1, pending: 1, avgRating: 4 });
    expect(o.teams.map((t: { name: string; total: number }) => [t.name, t.total])).toEqual([
      ['Turma 1', 3],
      ['Turma 2', 1],
    ]);
    expect(o.games).toEqual([{ gameType: 'FORCA', plays: 3, avgScorePct: 63.3 }]);
  });

  it('ranking por pontos acumulados, com empate na mesma posição', async () => {
    const r = (await overview()).body.overview.ranking as { name: string; total: number; rank: number }[];
    expect(r.map((x) => [x.name, x.total, x.rank])).toEqual([
      ['Ana', 1125, 1],
      ['Bruno', 300, 2],
      ['Carla', 0, 3],
    ]);
  });

  it('satisfação: distribuição, melhores/piores e comentários', async () => {
    const s = (await overview()).body.overview.satisfaction;
    expect(s.distribution.find((d: { rating: number }) => d.rating === 5).count).toBe(1);
    expect(s.distribution.find((d: { rating: number }) => d.rating === 3).count).toBe(1);
    expect(s.best[0]).toMatchObject({ title: 'Aula 1', avgRating: 4, ratingCount: 2 });
    expect(s.comments).toHaveLength(1);
    expect(s.comments[0]).toMatchObject({ student: 'Ana', comment: 'Ótima!' });
  });

  it('filtra por turma; turma de outro instrutor não existe', async () => {
    const t2 = (await overview(tokenA, `?teamId=${ids.t2}`)).body.overview;
    expect(t2.kpis).toMatchObject({ students: 1, deliveries: 1, pending: 1 });
    expect((await overview(tokenB, `?teamId=${ids.t2}`)).status).toBe(404);
    expect((await overview(tokenA, '?teamId=abc')).status).toBe(400);
    const empty = (await overview(tokenB)).body.overview;
    expect(empty.kpis).toMatchObject({ students: 0, activities: 0, completionPct: null });
  });

  it('atividade despublicada sai das métricas', async () => {
    await prisma.activity.update({ where: { id: ids.act }, data: { publishedAt: null } });
    const o = (await overview()).body.overview;
    expect(o.kpis).toMatchObject({ activities: 0, deliveries: 0 });
  });
});

describe('detalhe da atividade', () => {
  it('lista os alunos com pendentes primeiro e o desempenho por jogo', async () => {
    const res = await request(app).get(`/api/dashboard/activities/${ids.act}`).set(auth(tokenA));
    expect(res.status).toBe(200);
    expect(res.body.counts).toEqual({ total: 3, done: 1, inProgress: 1, pending: 1 });
    expect(res.body.students.map((s: { name: string; status: string }) => [s.name, s.status])).toEqual([
      ['Carla', 'PENDING'],
      ['Bruno', 'IN_PROGRESS'],
      ['Ana', 'DONE'],
    ]);
    expect(res.body.students[0].teams).toEqual(['Turma 1', 'Turma 2']);
    expect(res.body.games).toHaveLength(2);
    expect(res.body.games[0]).toMatchObject({ blockId: 'bloco-0001', plays: 2, maxScore: 750, avgScorePct: 70 });
    expect(res.body.feedbacks).toHaveLength(2);
  });

  it('rascunho => 409; atividade de outro instrutor => 404', async () => {
    expect((await request(app).get(`/api/dashboard/activities/${ids.draft}`).set(auth(tokenA))).status).toBe(409);
    expect((await request(app).get(`/api/dashboard/activities/${ids.act}`).set(auth(tokenB))).status).toBe(404);
  });
});

describe('ficha do aluno', () => {
  it('mostra as atividades do aluno; aluno de outro instrutor => 404', async () => {
    const res = await request(app).get(`/api/dashboard/students/${ids.bruno}`).set(auth(tokenA));
    expect(res.status).toBe(200);
    expect(res.body.student).toMatchObject({ name: 'Bruno', total: 300, assigned: 1, done: 0 });
    expect(res.body.activities[0]).toMatchObject({ title: 'Aula 1', status: 'IN_PROGRESS', played: 1, gameCount: 2, rating: 3 });
    expect((await request(app).get(`/api/dashboard/students/${ids.bruno}`).set(auth(tokenB))).status).toBe(404);
  });
});

describe('cálculo (puro)', () => {
  it('atividade só de texto: concluída quando há avaliação', () => {
    const teams = [{ id: 't', name: 'T', students: [{ id: 's1', name: 'A' }, { id: 's2', name: 'B' }], activityIds: ['a'] }];
    const acts = [{ id: 'a', title: 'Leitura', games: [] }];
    const fb = [{ studentId: 's1', activityId: 'a', rating: 4, comment: null, createdAt: new Date() }];
    const data = buildAssignments(teams, acts, [], fb);
    const o = buildOverview(teams, acts, data, fb);
    expect(o.kpis).toMatchObject({ deliveries: 2, pending: 1, completionPct: 50, avgScorePct: null });
  });

  it('ignora notas de jogos que não existem mais na atividade', () => {
    const teams = [{ id: 't', name: 'T', students: [{ id: 's1', name: 'A' }], activityIds: ['a'] }];
    const acts = [{ id: 'a', title: 'X', games: [{ blockId: 'g1', gameType: 'QUIZ' }] }];
    const scores = [
      { studentId: 's1', activityId: 'a', blockId: 'g1', gameType: 'QUIZ', score: 100, maxScore: 300, completedAt: new Date() },
      { studentId: 's1', activityId: 'a', blockId: 'removido', gameType: 'QUIZ', score: 999, maxScore: 999, completedAt: new Date() },
    ];
    const { assignments } = buildAssignments(teams, acts, scores, []);
    expect(assignments[0]).toMatchObject({ score: 100, maxScore: 300, status: 'DONE' });
  });
});
