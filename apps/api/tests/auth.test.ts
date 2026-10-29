import express from 'express';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { hashPassword } from '../src/auth/password';
import { requireAuth, requirePasswordChanged, requireRole } from '../src/middleware/auth';
import { prisma } from '../src/prisma';

const app = createApp();

const INSTRUCTOR = { login: 'prof@escola.com', password: 'Senha1234' };
const STUDENT = { login: 'aluno1', password: 'Alunos2026!' };

beforeEach(async () => {
  await prisma.team.deleteMany(); // turmas de outros arquivos de teste impediriam apagar os instrutores
  await prisma.user.deleteMany();
  await prisma.user.createMany({
    data: [
      {
        name: 'Professor',
        login: INSTRUCTOR.login,
        email: INSTRUCTOR.login,
        passwordHash: await hashPassword(INSTRUCTOR.password),
        role: 'INSTRUCTOR',
        mustChangePassword: false,
      },
      {
        name: 'Aluno Um',
        login: STUDENT.login,
        passwordHash: await hashPassword(STUDENT.password),
        role: 'STUDENT',
        mustChangePassword: true,
      },
    ],
  });
});

afterAll(async () => {
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

const login = (l: string, p: string) => request(app).post('/api/auth/login').send({ login: l, password: p });

describe('POST /api/auth/login', () => {
  it('autentica o instrutor e devolve token sem expor o hash', async () => {
    const res = await login(INSTRUCTOR.login, INSTRUCTOR.password);
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ login: INSTRUCTOR.login, role: 'INSTRUCTOR', mustChangePassword: false });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(JSON.stringify(res.body)).not.toContain('password_hash');
  });

  it('marca o aluno em primeiro acesso com mustChangePassword', async () => {
    const res = await login(STUDENT.login, STUDENT.password);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ role: 'STUDENT', mustChangePassword: true });
  });

  it('ignora maiúsculas e espaços no login', async () => {
    const res = await login('  ALUNO1 ', STUDENT.password);
    expect(res.status).toBe(200);
  });

  it('rejeita senha errada e login inexistente com a mesma mensagem', async () => {
    const wrongPass = await login(STUDENT.login, 'errada123');
    const noUser = await login('naoexiste', 'qualquer123');
    expect(wrongPass.status).toBe(401);
    expect(noUser.status).toBe(401);
    expect(wrongPass.body.error).toBe(noUser.body.error);
  });

  it('valida o corpo da requisição', async () => {
    const res = await request(app).post('/api/auth/login').send({ login: '' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('exige token', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
  });

  it('rejeita token adulterado', async () => {
    const { body } = await login(INSTRUCTOR.login, INSTRUCTOR.password);
    // troca o 1º caractere da assinatura (acrescentar um caractere no fim poderia passar despercebido)
    const [h, p, s] = (body.token as string).split('.');
    const tampered = `${h}.${p}.${s[0] === 'A' ? 'B' : 'A'}${s.slice(1)}`;
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tampered}`);
    expect(res.status).toBe(401);
  });

  it('devolve o usuário logado', async () => {
    const { body } = await login(INSTRUCTOR.login, INSTRUCTOR.password);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.login).toBe(INSTRUCTOR.login);
  });
});

describe('POST /api/auth/change-password', () => {
  const change = (token: string, currentPassword: string, newPassword: string) =>
    request(app).post('/api/auth/change-password').set('Authorization', `Bearer ${token}`).send({ currentPassword, newPassword });

  const studentToken = async () => (await login(STUDENT.login, STUDENT.password)).body.token as string;

  it('exige autenticação', async () => {
    const res = await request(app).post('/api/auth/change-password').send({ currentPassword: 'a', newPassword: 'b' });
    expect(res.status).toBe(401);
  });

  it('rejeita a senha atual incorreta', async () => {
    const res = await change(await studentToken(), 'errada123', 'NovaSenha1');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_CURRENT_PASSWORD');
  });

  it.each([
    ['curta demais', 'Ab1'],
    ['sem número', 'SomenteLetras'],
    ['sem letra', '123456789'],
  ])('rejeita nova senha %s', async (_nome, nova) => {
    const res = await change(await studentToken(), STUDENT.password, nova);
    expect(res.status).toBe(400);
  });

  it('rejeita nova senha igual à atual', async () => {
    const res = await change(await studentToken(), STUDENT.password, STUDENT.password);
    expect(res.status).toBe(400);
  });

  it('troca a senha, zera a flag e invalida a senha antiga', async () => {
    const res = await change(await studentToken(), STUDENT.password, 'NovaSenha1');
    expect(res.status).toBe(200);
    expect(res.body.user.mustChangePassword).toBe(false);
    expect(res.body.token).toEqual(expect.any(String));

    const inDb = await prisma.user.findUniqueOrThrow({ where: { login: STUDENT.login } });
    expect(inDb.mustChangePassword).toBe(false);

    expect((await login(STUDENT.login, STUDENT.password)).status).toBe(401);
    const again = await login(STUDENT.login, 'NovaSenha1');
    expect(again.status).toBe(200);
    expect(again.body.user.mustChangePassword).toBe(false);
  });
});

// Mini app só para testar os middlewares que as rotas das próximas fases vão usar
describe('middlewares de acesso', () => {
  const guarded = express();
  guarded.get('/negocio', requireAuth, requirePasswordChanged, (_req, res) => {
    res.json({ ok: true });
  });
  guarded.get('/so-instrutor', requireAuth, requirePasswordChanged, requireRole('INSTRUCTOR'), (_req, res) => {
    res.json({ ok: true });
  });

  it('bloqueia rotas de negócio até o aluno trocar a senha', async () => {
    const { body } = await login(STUDENT.login, STUDENT.password);
    const res = await request(guarded).get('/negocio').set('Authorization', `Bearer ${body.token}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MUST_CHANGE_PASSWORD');
  });

  it('libera depois da troca de senha', async () => {
    const first = await login(STUDENT.login, STUDENT.password);
    const changed = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${first.body.token}`)
      .send({ currentPassword: STUDENT.password, newPassword: 'NovaSenha1' });
    const res = await request(guarded).get('/negocio').set('Authorization', `Bearer ${changed.body.token}`);
    expect(res.status).toBe(200);
  });

  it('requireRole nega aluno em rota de instrutor e libera o instrutor', async () => {
    const first = await login(STUDENT.login, STUDENT.password);
    const changed = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${first.body.token}`)
      .send({ currentPassword: STUDENT.password, newPassword: 'NovaSenha1' });
    const asStudent = await request(guarded).get('/so-instrutor').set('Authorization', `Bearer ${changed.body.token}`);
    expect(asStudent.status).toBe(403);

    const prof = await login(INSTRUCTOR.login, INSTRUCTOR.password);
    const asInstructor = await request(guarded).get('/so-instrutor').set('Authorization', `Bearer ${prof.body.token}`);
    expect(asInstructor.status).toBe(200);
  });
});
