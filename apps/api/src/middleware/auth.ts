import type { NextFunction, Request, Response } from 'express';
import type { Role, User } from '@prisma/client';
import { prisma } from '../prisma';
import { verifyToken } from '../auth/token';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

// Exige um token válido. O usuário é lido do banco a cada requisição, então
// mudanças (troca de senha, remoção da conta) valem na hora.
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  const payload = header?.startsWith('Bearer ') ? verifyToken(header.slice(7)) : null;
  if (!payload) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  req.user = user;
  next();
}

// Use DEPOIS de requireAuth em toda rota de negócio: enquanto o aluno não trocar
// a senha temporária, nada além de /auth/me e /auth/change-password funciona.
export function requirePasswordChanged(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.mustChangePassword) {
    res.status(403).json({ error: 'É necessário trocar a senha antes de continuar', code: 'MUST_CHANGE_PASSWORD' });
    return;
  }
  next();
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Sem permissão', code: 'FORBIDDEN' });
      return;
    }
    next();
  };
