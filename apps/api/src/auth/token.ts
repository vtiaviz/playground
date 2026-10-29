import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { config } from '../config';

export function signToken(user: { id: string; role: Role }): string {
  return jwt.sign({ role: user.role }, config.jwtSecret, {
    subject: user.id,
    algorithm: 'HS256',
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

// Devolve o id do usuário (claim `sub`) ou null se o token for inválido/expirado/adulterado.
export function verifyToken(token: string): { sub: string } | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || !payload.sub) return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}
