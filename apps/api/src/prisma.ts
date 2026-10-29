import './config'; // garante que o .env foi carregado antes de criar o client
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
