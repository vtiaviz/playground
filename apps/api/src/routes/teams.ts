import { randomUUID } from 'node:crypto';
import { Router, type Request } from 'express';
import { z } from 'zod';
import type { User } from '@prisma/client';
import { prisma } from '../prisma';
import { hashPassword } from '../auth/password';
import { requireAuth, requirePasswordChanged, requireRole } from '../middleware/auth';
import { MAX_BATCH, baseLogin, generateTempPassword, parseStudentLines } from '../lib/students';

export const teamsRouter = Router();

// Tudo aqui é exclusivo do instrutor (e só das turmas dele)
teamsRouter.use(requireAuth, requirePasswordChanged, requireRole('INSTRUCTOR'));

const idSchema = z.string().uuid('Identificador inválido');

const optionalShift = z
  .string()
  .trim()
  .max(40, 'O turno pode ter no máximo 40 caracteres')
  .nullish()
  .transform((v) => (v ? v : null));

const createTeamSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da turma').max(80, 'O nome pode ter no máximo 80 caracteres'),
  shift: optionalShift,
});

const updateTeamSchema = z
  .object({
    name: z.string().trim().min(1, 'Informe o nome da turma').max(80, 'O nome pode ter no máximo 80 caracteres').optional(),
    shift: optionalShift.optional(),
  })
  .refine((d) => d.name !== undefined || d.shift !== undefined, { message: 'Nada para atualizar' });

const importSchema = z.object({
  text: z.string().max(50_000, 'Texto muito grande'),
});

const resetSchema = z.object({
  studentIds: z.array(idSchema).max(MAX_BATCH).optional(),
});

const toStudent = (u: User) => ({
  id: u.id,
  name: u.name,
  login: u.login,
  email: u.email,
  registration: u.registration,
  mustChangePassword: u.mustChangePassword,
});

// Só encontra turmas do instrutor logado (de outro instrutor => "não existe")
async function findOwnedTeam(req: Request) {
  const id = idSchema.parse(req.params.id);
  return prisma.team.findFirst({ where: { id, instructorId: req.user!.id } });
}

const notFound = { error: 'Turma não encontrada' };

// ---------- CRUD de turmas ----------

teamsRouter.get('/', async (req, res) => {
  const teams = await prisma.team.findMany({
    where: { instructorId: req.user!.id },
    orderBy: { name: 'asc' },
    include: { _count: { select: { students: true } } },
  });
  res.json({
    teams: teams.map((t) => ({ id: t.id, name: t.name, shift: t.shift, studentCount: t._count.students })),
  });
});

teamsRouter.post('/', async (req, res) => {
  const data = createTeamSchema.parse(req.body);
  const team = await prisma.team.create({ data: { ...data, instructorId: req.user!.id } });
  res.status(201).json({ team: { id: team.id, name: team.name, shift: team.shift, studentCount: 0 } });
});

teamsRouter.get('/:id', async (req, res) => {
  const team = await findOwnedTeam(req);
  if (!team) {
    res.status(404).json(notFound);
    return;
  }
  const rows = await prisma.teamStudent.findMany({ where: { teamId: team.id }, include: { student: true } });
  const students = rows
    .map((r) => toStudent(r.student))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  res.json({ team: { id: team.id, name: team.name, shift: team.shift, studentCount: students.length }, students });
});

teamsRouter.patch('/:id', async (req, res) => {
  const team = await findOwnedTeam(req);
  if (!team) {
    res.status(404).json(notFound);
    return;
  }
  const data = updateTeamSchema.parse(req.body);
  const updated = await prisma.team.update({ where: { id: team.id }, data });
  const studentCount = await prisma.teamStudent.count({ where: { teamId: team.id } });
  res.json({ team: { id: updated.id, name: updated.name, shift: updated.shift, studentCount } });
});

// Apaga a turma e os vínculos (alunos e atividades), mas NÃO apaga as contas dos alunos.
teamsRouter.delete('/:id', async (req, res) => {
  const team = await findOwnedTeam(req);
  if (!team) {
    res.status(404).json(notFound);
    return;
  }
  await prisma.team.delete({ where: { id: team.id } });
  res.status(204).end();
});

// ---------- Importação em lote ----------

interface ImportError {
  line: number;
  text: string;
  message: string;
}

teamsRouter.post('/:id/students/import', async (req, res) => {
  const team = await findOwnedTeam(req);
  if (!team) {
    res.status(404).json(notFound);
    return;
  }
  const instructorId = req.user!.id;
  const { text } = importSchema.parse(req.body);

  const parsed = parseStudentLines(text);
  if (parsed.entries.length + parsed.errors.length > MAX_BATCH) {
    res.status(400).json({ error: `Importe no máximo ${MAX_BATCH} alunos por vez` });
    return;
  }
  if (parsed.entries.length === 0 && parsed.errors.length === 0) {
    res.status(400).json({ error: 'Cole ao menos um aluno (um por linha)' });
    return;
  }

  const errors: ImportError[] = parsed.errors.map((e) => ({ ...e }));
  const lineText = new Map(text.split(/\r?\n/).map((t, i) => [i + 1, t.trim()]));

  // Quem já existe? (por e-mail/matrícula; nomes sem identificador sempre viram contas novas)
  const identified = parsed.entries.filter((e) => e.email || e.registration);
  const existingUsers = await prisma.user.findMany({
    where: { login: { in: identified.map(baseLogin) } },
    include: { enrollments: { where: { team: { instructorId } }, select: { teamId: true } } },
  });
  const existingByLogin = new Map(existingUsers.map((u) => [u.login, u]));

  // Logins já ocupados por nomes parecidos (para numerar: joao.silva, joao.silva2...)
  const slugEntries = parsed.entries.filter((e) => !e.email && !e.registration);
  const taken = new Set<string>();
  if (slugEntries.length > 0) {
    const used = await prisma.user.findMany({
      where: { OR: [...new Set(slugEntries.map(baseLogin))].map((s) => ({ login: { startsWith: s } })) },
      select: { login: true },
    });
    used.forEach((u) => taken.add(u.login));
  }

  const seen = new Set<string>(); // logins repetidos dentro do próprio texto
  const toCreate: { id: string; name: string; login: string; email: string | null; registration: string | null; password: string }[] = [];
  const toEnroll: { id: string; name: string; login: string }[] = [];
  const alreadyInTeam: { id: string; name: string; login: string }[] = [];

  for (const entry of parsed.entries) {
    const hasId = Boolean(entry.email || entry.registration);
    let login = baseLogin(entry);

    if (hasId) {
      if (seen.has(login)) {
        errors.push({ line: entry.line, text: lineText.get(entry.line) ?? '', message: `Login repetido na lista: ${login}` });
        continue;
      }
      seen.add(login);
      const existing = existingByLogin.get(login);
      if (existing) {
        // Só reaproveita alunos que já são "do" instrutor; senão não revela nem vincula contas de terceiros
        if (existing.role !== 'STUDENT' || existing.enrollments.length === 0) {
          errors.push({ line: entry.line, text: lineText.get(entry.line) ?? '', message: `O login ${login} já está em uso por outro cadastro` });
          continue;
        }
        const info = { id: existing.id, name: existing.name, login: existing.login };
        if (existing.enrollments.some((e) => e.teamId === team.id)) alreadyInTeam.push(info);
        else toEnroll.push(info);
        continue;
      }
    } else {
      // só nome: gera joao.silva, joao.silva2, joao.silva3...
      const base = login;
      for (let n = 2; taken.has(login) || seen.has(login); n++) login = `${base}${n}`;
      seen.add(login);
    }

    toCreate.push({
      id: randomUUID(),
      name: entry.name,
      login,
      email: entry.email,
      registration: entry.registration,
      password: generateTempPassword(),
    });
  }

  const hashes = await Promise.all(toCreate.map((s) => hashPassword(s.password)));

  try {
    await prisma.$transaction([
      prisma.user.createMany({
        data: toCreate.map((s, i) => ({
          id: s.id,
          name: s.name,
          login: s.login,
          email: s.email,
          registration: s.registration,
          passwordHash: hashes[i],
          role: 'STUDENT' as const,
          mustChangePassword: true,
        })),
      }),
      prisma.teamStudent.createMany({
        data: [...toCreate, ...toEnroll].map((s) => ({ teamId: team.id, studentId: s.id })),
        skipDuplicates: true,
      }),
    ]);
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') {
      res.status(409).json({ error: 'Algum login já existe. Tente novamente.' });
      return;
    }
    throw e;
  }

  res.status(201).json({
    created: toCreate.map((s) => ({ id: s.id, name: s.name, login: s.login, registration: s.registration, password: s.password })),
    enrolledExisting: toEnroll,
    alreadyInTeam,
    errors: errors.sort((a, b) => a.line - b.line),
  });
});

// ---------- Senhas temporárias ----------

// Gera novas senhas temporárias e obriga a troca no próximo acesso.
// Sem `studentIds`: todos os alunos da turma que ainda não trocaram a senha (credenciais pendentes).
teamsRouter.post('/:id/students/reset-passwords', async (req, res) => {
  const team = await findOwnedTeam(req);
  if (!team) {
    res.status(404).json(notFound);
    return;
  }
  const { studentIds } = resetSchema.parse(req.body ?? {});

  const rows = await prisma.teamStudent.findMany({
    where: {
      teamId: team.id,
      ...(studentIds ? { studentId: { in: studentIds } } : { student: { mustChangePassword: true } }),
    },
    include: { student: true },
  });
  const students = rows.map((r) => r.student).filter((s) => s.role === 'STUDENT');

  if (students.length > MAX_BATCH) {
    res.status(400).json({ error: `Selecione no máximo ${MAX_BATCH} alunos por vez` });
    return;
  }

  const credentials = students.map((s) => ({ id: s.id, name: s.name, login: s.login, password: generateTempPassword() }));
  const hashes = await Promise.all(credentials.map((c) => hashPassword(c.password)));

  await prisma.$transaction(
    credentials.map((c, i) =>
      prisma.user.update({ where: { id: c.id }, data: { passwordHash: hashes[i], mustChangePassword: true } }),
    ),
  );

  res.json({ credentials });
});

// Tira o aluno da turma (a conta e o histórico dele continuam existindo)
teamsRouter.delete('/:id/students/:studentId', async (req, res) => {
  const team = await findOwnedTeam(req);
  if (!team) {
    res.status(404).json(notFound);
    return;
  }
  const studentId = idSchema.parse(req.params.studentId);
  const { count } = await prisma.teamStudent.deleteMany({ where: { teamId: team.id, studentId } });
  if (count === 0) {
    res.status(404).json({ error: 'Aluno não encontrado nesta turma' });
    return;
  }
  res.status(204).end();
});
