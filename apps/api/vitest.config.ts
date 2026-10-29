import 'dotenv/config';
import { defineConfig } from 'vitest/config';

// Os testes usam um banco SEPARADO (DATABASE_URL_TEST), nunca o de desenvolvimento.
const testDb = process.env.DATABASE_URL_TEST;
if (!testDb) {
  throw new Error('Defina DATABASE_URL_TEST no apps/api/.env (veja .env.example).');
}
if (testDb === process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL_TEST não pode ser igual a DATABASE_URL: os testes apagam dados.');
}

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./tests/global-setup.ts'],
    fileParallelism: false, // todos os arquivos compartilham o mesmo banco
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDb,
      JWT_SECRET: 'segredo-de-teste-segredo-de-teste-segredo',
      BCRYPT_ROUNDS: '4', // rápido nos testes
      LOGIN_RATE_LIMIT: '1000',
    },
  },
});
