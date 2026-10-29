import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ROUNDS = 10;

async function main() {
  const login = (process.env.SEED_INSTRUCTOR_LOGIN ?? 'instrutor@exemplo.com').trim().toLowerCase();
  const password = process.env.SEED_INSTRUCTOR_PASSWORD ?? 'Instrutor2026!';
  const name = process.env.SEED_INSTRUCTOR_NAME ?? 'Instrutor';

  // O instrutor só é criado se não existir: rodar o seed de novo não troca a senha dele.
  const instructor = await prisma.user.upsert({
    where: { login },
    update: {},
    create: {
      name,
      login,
      email: login.includes('@') ? login : null,
      passwordHash: await bcrypt.hash(password, ROUNDS),
      role: 'INSTRUCTOR',
      mustChangePassword: false,
    },
  });
  console.log(`Instrutor: ${instructor.login}`);

  // Aluno de demonstração para testar o fluxo de primeiro acesso (nunca em produção).
  if (process.env.NODE_ENV !== 'production') {
    const demoPassword = 'Alunos2026!';
    await prisma.user.upsert({
      where: { login: 'aluno.teste' },
      // rodar o seed de novo "reseta" o aluno de teste para o estado de primeiro acesso
      update: { passwordHash: await bcrypt.hash(demoPassword, ROUNDS), mustChangePassword: true },
      create: {
        name: 'Aluno de Teste',
        login: 'aluno.teste',
        passwordHash: await bcrypt.hash(demoPassword, ROUNDS),
        role: 'STUDENT',
        mustChangePassword: true,
      },
    });
    console.log(`Aluno de teste: aluno.teste / ${demoPassword} (troca de senha obrigatória)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
