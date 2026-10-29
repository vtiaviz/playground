import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { hashPassword } from '../src/auth/password';
import { signToken } from '../src/auth/token';
import { prisma } from '../src/prisma';

const app = createApp();
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

const forca = { title: 'Forca da natureza', theme: 'Natureza', words: ['sol', 'lua', 'mar', 'rio', 'céu'] };
const quiz = { title: 'Quiz HD', questions: [{ text: 'O que é HD?', options: ['Disco', 'Tela'], correct: 0 }] };
const frases = {
  title: 'Trânsito',
  sentences: [{ segments: ['A preferência é de quem vem do lado ', '.'], answers: ['direito'], explanation: '' }],
  decoys: ['esquerdo'],
};

let tokenA = '';
let tokenB = '';
let tokenStudent = '';

async function wipe() {
  await prisma.activity.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany(); // apaga também a biblioteca (cascata)
}

beforeEach(async () => {
  await wipe();
  const hash = await hashPassword('Senha1234');
  const mk = (name: string, login: string, role: 'INSTRUCTOR' | 'STUDENT') =>
    prisma.user.create({ data: { name, login, passwordHash: hash, role, mustChangePassword: false } });
  tokenA = signToken(await mk('A', 'a@escola.com', 'INSTRUCTOR'));
  tokenB = signToken(await mk('B', 'b@escola.com', 'INSTRUCTOR'));
  tokenStudent = signToken(await mk('Aluno', 'aluno', 'STUDENT'));
});

afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

const save = (token: string, gameType: string, config: unknown) =>
  request(app).post('/api/games').set(auth(token)).send({ gameType, config });

describe('biblioteca de jogos', () => {
  it('exige login e perfil de instrutor', async () => {
    expect((await request(app).get('/api/games')).status).toBe(401);
    expect((await request(app).get('/api/games').set(auth(tokenStudent))).status).toBe(403);
  });

  it('salva, lista (mais recente primeiro) e lê um jogo', async () => {
    const a = await save(tokenA, 'FORCA', forca);
    expect(a.status).toBe(201);
    expect(a.body.game).toMatchObject({ gameType: 'FORCA', title: 'Forca da natureza', maxScore: 750 });
    await save(tokenA, 'QUIZ', quiz);

    const list = await request(app).get('/api/games').set(auth(tokenA));
    expect(list.body.games.map((g: { title: string }) => g.title)).toEqual(['Quiz HD', 'Forca da natureza']);

    const one = await request(app).get(`/api/games/${a.body.game.id}`).set(auth(tokenA));
    expect(one.body.game.config.words).toHaveLength(5);
  });

  it('aceita o Complete as Frases e recusa pegadinha igual a uma resposta', async () => {
    const ok = await save(tokenA, 'COMPLETE_FRASES', frases);
    expect(ok.status).toBe(201);
    expect(ok.body.game).toMatchObject({ gameType: 'COMPLETE_FRASES', title: 'Trânsito', maxScore: 10 });
    expect((await save(tokenA, 'COMPLETE_FRASES', { ...frases, decoys: ['Direito'] })).status).toBe(400);
  });

  it('recusa tipo desconhecido e configuração inválida', async () => {
    expect((await save(tokenA, 'XADREZ', {})).status).toBe(400);
    expect((await save(tokenA, 'FORCA', { title: 'x', words: ['a'] })).status).toBe(400);
    expect((await save(tokenA, 'QUIZ', { title: 'x', questions: [] })).status).toBe(400);
    expect(await prisma.savedGame.count()).toBe(0);
  });

  it('edita (o título acompanha a configuração) sem trocar o tipo', async () => {
    const id = (await save(tokenA, 'FORCA', forca)).body.game.id;
    const res = await request(app).put(`/api/games/${id}`).set(auth(tokenA)).send({ config: { ...forca, title: 'Outro nome' } });
    expect(res.status).toBe(200);
    expect(res.body.game.title).toBe('Outro nome');
    expect((await request(app).put(`/api/games/${id}`).set(auth(tokenA)).send({ config: { title: 'x', words: [] } })).status).toBe(400);
  });

  it('duplica com "(cópia)" no título', async () => {
    const id = (await save(tokenA, 'FORCA', forca)).body.game.id;
    const copy = await request(app).post(`/api/games/${id}/duplicate`).set(auth(tokenA));
    expect(copy.status).toBe(201);
    expect(copy.body.game.title).toBe('Forca da natureza (cópia)');
    expect(copy.body.game.config.title).toBe('Forca da natureza (cópia)');
    expect(copy.body.game.id).not.toBe(id);
  });

  it('exclui', async () => {
    const id = (await save(tokenA, 'FORCA', forca)).body.game.id;
    expect((await request(app).delete(`/api/games/${id}`).set(auth(tokenA))).status).toBe(204);
    expect(await prisma.savedGame.count()).toBe(0);
  });

  it('um instrutor não vê nem mexe nos jogos de outro', async () => {
    const id = (await save(tokenA, 'FORCA', forca)).body.game.id;
    expect((await request(app).get('/api/games').set(auth(tokenB))).body.games).toEqual([]);
    expect((await request(app).get(`/api/games/${id}`).set(auth(tokenB))).status).toBe(404);
    expect((await request(app).put(`/api/games/${id}`).set(auth(tokenB)).send({ config: forca })).status).toBe(404);
    expect((await request(app).post(`/api/games/${id}/duplicate`).set(auth(tokenB))).status).toBe(404);
    expect((await request(app).delete(`/api/games/${id}`).set(auth(tokenB))).status).toBe(404);
  });
});
