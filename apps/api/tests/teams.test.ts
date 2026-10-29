import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { hashPassword } from '../src/auth/password';
import { signToken } from '../src/auth/token';
import { prisma } from '../src/prisma';

const app = createApp();

let tokenA = '';
let tokenB = '';
let tokenStudent = '';
let tokenPending = '';

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

beforeEach(async () => {
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
  const hash = await hashPassword('Senha1234');
  const mk = (name: string, login: string, role: 'INSTRUCTOR' | 'STUDENT', mustChangePassword = false) =>
    prisma.user.create({ data: { name, login, passwordHash: hash, role, mustChangePassword } });

  const a = await mk('Instrutora A', 'a@escola.com', 'INSTRUCTOR');
  const b = await mk('Instrutor B', 'b@escola.com', 'INSTRUCTOR');
  const s = await mk('Aluno Solto', 'solto', 'STUDENT');
  const p = await mk('Instrutor Pendente', 'p@escola.com', 'INSTRUCTOR', true);
  tokenA = signToken(a);
  tokenB = signToken(b);
  tokenStudent = signToken(s);
  tokenPending = signToken(p);
});

afterAll(async () => {
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

const createTeam = async (token: string, name = 'Turma 1', shift?: string) => {
  const res = await request(app).post('/api/teams').set(auth(token)).send({ name, shift });
  expect(res.status).toBe(201);
  return res.body.team as { id: string; name: string; shift: string | null; studentCount: number };
};

const importText = (token: string, teamId: string, text: string) =>
  request(app).post(`/api/teams/${teamId}/students/import`).set(auth(token)).send({ text });

const loginAs = (login: string, password: string) => request(app).post('/api/auth/login').send({ login, password });

describe('acesso', () => {
  it('exige login', async () => {
    expect((await request(app).get('/api/teams')).status).toBe(401);
  });

  it('nega aluno', async () => {
    expect((await request(app).get('/api/teams').set(auth(tokenStudent))).status).toBe(403);
  });

  it('nega instrutor que ainda não trocou a senha', async () => {
    const res = await request(app).get('/api/teams').set(auth(tokenPending));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MUST_CHANGE_PASSWORD');
  });
});

describe('CRUD de turmas', () => {
  it('cria, lista, edita e exclui', async () => {
    const team = await createTeam(tokenA, '  Turma Manhã ', 'Manhã');
    expect(team).toMatchObject({ name: 'Turma Manhã', shift: 'Manhã', studentCount: 0 });

    const list = await request(app).get('/api/teams').set(auth(tokenA));
    expect(list.body.teams).toHaveLength(1);

    const patched = await request(app).patch(`/api/teams/${team.id}`).set(auth(tokenA)).send({ name: 'Turma Tarde', shift: '' });
    expect(patched.status).toBe(200);
    expect(patched.body.team).toMatchObject({ name: 'Turma Tarde', shift: null });

    const del = await request(app).delete(`/api/teams/${team.id}`).set(auth(tokenA));
    expect(del.status).toBe(204);
    expect((await request(app).get(`/api/teams/${team.id}`).set(auth(tokenA))).status).toBe(404);
  });

  it('valida o nome', async () => {
    const res = await request(app).post('/api/teams').set(auth(tokenA)).send({ name: '   ' });
    expect(res.status).toBe(400);
  });

  it('rejeita id malformado', async () => {
    expect((await request(app).get('/api/teams/abc').set(auth(tokenA))).status).toBe(400);
  });

  it('um instrutor não enxerga nem altera turmas de outro', async () => {
    const team = await createTeam(tokenA);
    expect((await request(app).get(`/api/teams/${team.id}`).set(auth(tokenB))).status).toBe(404);
    expect((await request(app).patch(`/api/teams/${team.id}`).set(auth(tokenB)).send({ name: 'X' })).status).toBe(404);
    expect((await request(app).delete(`/api/teams/${team.id}`).set(auth(tokenB))).status).toBe(404);
    expect((await importText(tokenB, team.id, 'Ana Souza')).status).toBe(404);
    expect((await request(app).get('/api/teams').set(auth(tokenB))).body.teams).toHaveLength(0);
  });
});

describe('importação de alunos', () => {
  const SAMPLE = ['Maria da Silva', 'Pedro Alves; pedro@escola.com', 'Carla Dias; 2024003', 'linha-ruim-sem-nome 2024009 x@@y'].join('\n');

  it('cria alunos com senha temporária, vincula à turma e obriga a troca no 1º acesso', async () => {
    const team = await createTeam(tokenA);
    const res = await importText(tokenA, team.id, SAMPLE);
    expect(res.status).toBe(201);

    const logins = res.body.created.map((c: { login: string }) => c.login).sort();
    expect(logins).toEqual(['2024003', 'maria.silva', 'pedro@escola.com']);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].line).toBe(4);

    for (const c of res.body.created as { login: string; password: string }[]) {
      expect(c.password).toHaveLength(10);
      const l = await loginAs(c.login, c.password);
      expect(l.status).toBe(200);
      expect(l.body.user).toMatchObject({ role: 'STUDENT', mustChangePassword: true });
    }

    const detail = await request(app).get(`/api/teams/${team.id}`).set(auth(tokenA));
    expect(detail.body.students).toHaveLength(3);
    expect(detail.body.team.studentCount).toBe(3);
    // a lista nunca expõe senha nem hash (mustChangePassword é só uma flag e pode aparecer)
    expect(JSON.stringify(detail.body)).not.toMatch(/"password"|passwordHash|password_hash/i);
  });

  it('numera logins gerados pelo nome quando há homônimos', async () => {
    const team = await createTeam(tokenA);
    const res = await importText(tokenA, team.id, 'Ana Souza\nAna Souza\nAna Maria Souza');
    expect(res.status).toBe(201);
    expect(res.body.created.map((c: { login: string }) => c.login).sort()).toEqual(['ana.souza', 'ana.souza2', 'ana.souza3']);
  });

  it('importar de novo não duplica nem troca senha de quem já está na turma', async () => {
    const team = await createTeam(tokenA);
    const first = await importText(tokenA, team.id, 'Pedro Alves; pedro@escola.com');
    const { password } = first.body.created[0];

    const again = await importText(tokenA, team.id, 'Pedro Alves; pedro@escola.com');
    expect(again.status).toBe(201);
    expect(again.body.created).toHaveLength(0);
    expect(again.body.alreadyInTeam).toHaveLength(1);
    expect((await loginAs('pedro@escola.com', password)).status).toBe(200);
  });

  it('matricula em outra turma do mesmo instrutor um aluno que já existe', async () => {
    const t1 = await createTeam(tokenA, 'T1');
    const t2 = await createTeam(tokenA, 'T2');
    await importText(tokenA, t1.id, 'Pedro Alves; pedro@escola.com');
    const res = await importText(tokenA, t2.id, 'Pedro Alves; pedro@escola.com');
    expect(res.body.created).toHaveLength(0);
    expect(res.body.enrolledExisting).toHaveLength(1);
    expect((await request(app).get(`/api/teams/${t2.id}`).set(auth(tokenA))).body.students).toHaveLength(1);
  });

  it('não vincula aluno que pertence a outro instrutor', async () => {
    const tA = await createTeam(tokenA);
    const tB = await createTeam(tokenB);
    await importText(tokenB, tB.id, 'Pedro Alves; pedro@escola.com');

    const res = await importText(tokenA, tA.id, 'Pedro Alves; pedro@escola.com');
    expect(res.body.created).toHaveLength(0);
    expect(res.body.enrolledExisting).toHaveLength(0);
    expect(res.body.errors[0].message).toContain('já está em uso');
    expect((await request(app).get(`/api/teams/${tA.id}`).set(auth(tokenA))).body.students).toHaveLength(0);
  });

  it('não permite usar o login de um instrutor', async () => {
    const team = await createTeam(tokenA);
    const res = await importText(tokenA, team.id, 'Impostor; b@escola.com');
    expect(res.body.created).toHaveLength(0);
    expect(res.body.errors).toHaveLength(1);
  });

  it('avisa quando o mesmo login aparece duas vezes na lista', async () => {
    const team = await createTeam(tokenA);
    const res = await importText(tokenA, team.id, 'Ana; ana@x.com\nAna Souza; ana@x.com');
    expect(res.body.created).toHaveLength(1);
    expect(res.body.errors[0].message).toContain('repetido');
  });

  it('rejeita texto vazio e lotes grandes demais', async () => {
    const team = await createTeam(tokenA);
    expect((await importText(tokenA, team.id, '  \n ')).status).toBe(400);
    const big = Array.from({ length: 151 }, (_, i) => `Aluno Numero${i}`).join('\n');
    expect((await importText(tokenA, team.id, big)).status).toBe(400);
  });
});

describe('senhas temporárias e remoção', () => {
  const setup = async () => {
    const team = await createTeam(tokenA);
    const res = await importText(tokenA, team.id, 'Ana Souza\nBruno Lima');
    return { team, created: res.body.created as { id: string; login: string; password: string }[] };
  };

  it('gera novas senhas só para quem ainda não trocou, e a antiga deixa de valer', async () => {
    const { team, created } = await setup();
    const [ana, bruno] = created;

    // Ana troca a senha e deixa de estar "pendente"
    const l = await loginAs(ana.login, ana.password);
    await request(app)
      .post('/api/auth/change-password')
      .set(auth(l.body.token))
      .send({ currentPassword: ana.password, newPassword: 'MinhaSenha9' });

    const res = await request(app).post(`/api/teams/${team.id}/students/reset-passwords`).set(auth(tokenA)).send({});
    expect(res.status).toBe(200);
    expect(res.body.credentials).toHaveLength(1);
    expect(res.body.credentials[0].login).toBe(bruno.login);

    expect((await loginAs(bruno.login, bruno.password)).status).toBe(401);
    expect((await loginAs(bruno.login, res.body.credentials[0].password)).status).toBe(200);
    expect((await loginAs(ana.login, 'MinhaSenha9')).status).toBe(200); // Ana não foi afetada
  });

  it('reseta alunos específicos e volta a exigir a troca', async () => {
    const { team, created } = await setup();
    const [ana] = created;
    const l = await loginAs(ana.login, ana.password);
    await request(app)
      .post('/api/auth/change-password')
      .set(auth(l.body.token))
      .send({ currentPassword: ana.password, newPassword: 'MinhaSenha9' });

    const res = await request(app)
      .post(`/api/teams/${team.id}/students/reset-passwords`)
      .set(auth(tokenA))
      .send({ studentIds: [ana.id] });
    expect(res.body.credentials).toHaveLength(1);
    const again = await loginAs(ana.login, res.body.credentials[0].password);
    expect(again.body.user.mustChangePassword).toBe(true);
  });

  it('não reseta alunos de fora da turma', async () => {
    const { team } = await setup();
    const outsider = await prisma.user.findUniqueOrThrow({ where: { login: 'solto' } });
    const res = await request(app)
      .post(`/api/teams/${team.id}/students/reset-passwords`)
      .set(auth(tokenA))
      .send({ studentIds: [outsider.id] });
    expect(res.body.credentials).toHaveLength(0);
  });

  it('remove o aluno da turma sem apagar a conta', async () => {
    const { team, created } = await setup();
    const del = await request(app).delete(`/api/teams/${team.id}/students/${created[0].id}`).set(auth(tokenA));
    expect(del.status).toBe(204);
    expect((await request(app).get(`/api/teams/${team.id}`).set(auth(tokenA))).body.students).toHaveLength(1);
    expect(await prisma.user.findUnique({ where: { id: created[0].id } })).not.toBeNull();
    expect((await request(app).delete(`/api/teams/${team.id}/students/${created[0].id}`).set(auth(tokenA))).status).toBe(404);
  });

  it('excluir a turma não apaga as contas dos alunos', async () => {
    const { team, created } = await setup();
    await request(app).delete(`/api/teams/${team.id}`).set(auth(tokenA));
    expect(await prisma.user.count({ where: { id: { in: created.map((c) => c.id) } } })).toBe(2);
    expect(await prisma.teamStudent.count({ where: { teamId: team.id } })).toBe(0);
  });
});
