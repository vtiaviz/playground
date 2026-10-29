import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import type { User } from '@prisma/client';
import { config } from '../config';
import { prisma } from '../prisma';
import { dummyHash, hashPassword, verifyPassword } from '../auth/password';
import { signToken } from '../auth/token';
import { requireAuth } from '../middleware/auth';

export const normalizeLogin = (s: string) => s.trim().toLowerCase();

// Nunca devolve passwordHash
export const toPublicUser = (u: User) => ({
  id: u.id,
  name: u.name,
  login: u.login,
  email: u.email,
  role: u.role,
  mustChangePassword: u.mustChangePassword,
});

const loginSchema = z.object({
  login: z.string().min(1, 'Informe o login'),
  password: z.string().min(1, 'Informe a senha'),
});

export const newPasswordSchema = z
  .string()
  .min(8, 'A nova senha precisa ter ao menos 8 caracteres')
  .max(72, 'A nova senha pode ter no máximo 72 caracteres')
  .regex(/[A-Za-z]/, 'A nova senha precisa ter ao menos uma letra')
  .regex(/[0-9]/, 'A nova senha precisa ter ao menos um número');

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: newPasswordSchema,
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ['newPassword'],
    message: 'A nova senha precisa ser diferente da atual',
  });

// Só conta tentativas que falharam, por IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.loginRateLimit,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});

export const authRouter = Router();

authRouter.post('/login', loginLimiter, async (req, res) => {
  const { login, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { login: normalizeLogin(login) } });

  // Sempre faz uma verificação de hash, exista o usuário ou não
  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
  if (!user || !ok) {
    res.status(401).json({ error: 'Login ou senha inválidos' });
    return;
  }

  res.json({ token: signToken(user), user: toPublicUser(user) });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: toPublicUser(req.user!) });
});

// Vale para qualquer usuário logado; é também a única saída do estado mustChangePassword.
authRouter.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  const current = req.user!;

  if (!(await verifyPassword(currentPassword, current.passwordHash))) {
    // 400 (e não 401) para o front não confundir com sessão expirada
    res.status(400).json({ error: 'Senha atual incorreta', code: 'INVALID_CURRENT_PASSWORD' });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: current.id },
    data: { passwordHash: await hashPassword(newPassword), mustChangePassword: false },
  });

  res.json({ token: signToken(updated), user: toPublicUser(updated) });
});
