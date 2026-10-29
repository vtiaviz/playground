import { execSync } from 'node:child_process';

// Sincroniza o schema com o banco de TESTE antes de rodar os testes.
export default function setup() {
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST },
  });
}
