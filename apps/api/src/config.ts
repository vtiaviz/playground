import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET precisa ter ao menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
  LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(10),
  // Gerador de conteúdo com IA: qualquer API compatível com a da OpenAI (padrão: Groq, plano grátis)
  AI_API_KEY: z.string().default(''),
  AI_BASE_URL: z.string().url('AI_BASE_URL precisa ser uma URL').default('https://api.groq.com/openai/v1'),
  AI_MODEL: z.string().min(1).default('openai/gpt-oss-120b'),
  AI_MAX_SOURCE_CHARS: z.coerce.number().int().min(2000).max(200000).default(8000),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(500).max(32000).default(4000),
  AI_RATE_LIMIT: z.coerce.number().int().positive().default(20), // gerações por instrutor a cada 10 min
  // Tutor IA dos jogos (usa a mesma chave/modelo)
  AI_TUTOR_ENABLED: z
    .string()
    .default('true')
    .transform((v) => !/^(false|0|no|nao|não|off)$/i.test(v.trim())),
  AI_TUTOR_IDLE_SECONDS: z.coerce.number().int().min(0).max(3600).default(60), // 0 = nunca oferece sozinho
  AI_TUTOR_RATE_LIMIT: z.coerce.number().int().positive().default(15), // pedidos por aluno a cada 10 min
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:');
  for (const i of parsed.error.issues) console.error(`  ${i.path.join('.')}: ${i.message}`);
  process.exit(1);
}
const env = parsed.data;

if (env.NODE_ENV === 'production' && env.JWT_SECRET.length < 32) {
  console.error('Em produção, JWT_SECRET precisa ter ao menos 32 caracteres.');
  process.exit(1);
}

export const config = {
  env: env.NODE_ENV,
  port: env.PORT,
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  corsOrigins: env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean),
  bcryptRounds: env.BCRYPT_ROUNDS,
  loginRateLimit: env.LOGIN_RATE_LIMIT,
  ai: {
    apiKey: env.AI_API_KEY.trim(),
    baseUrl: env.AI_BASE_URL.replace(/\/+$/, ''),
    model: env.AI_MODEL,
    maxSourceChars: env.AI_MAX_SOURCE_CHARS,
    maxOutputTokens: env.AI_MAX_OUTPUT_TOKENS,
    rateLimit: env.AI_RATE_LIMIT,
  },
  tutor: {
    enabled: env.AI_TUTOR_ENABLED,
    idleSeconds: env.AI_TUTOR_IDLE_SECONDS,
    rateLimit: env.AI_TUTOR_RATE_LIMIT,
  },
};
