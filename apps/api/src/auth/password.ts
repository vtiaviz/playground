import bcrypt from 'bcryptjs';
import { config } from '../config';

export const hashPassword = (plain: string) => bcrypt.hash(plain, config.bcryptRounds);

export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

// Usado quando o login não existe: gasta o mesmo tempo de uma verificação real,
// para não revelar (pelo tempo de resposta) quais logins existem.
let dummy: Promise<string> | null = null;
export const dummyHash = () => (dummy ??= bcrypt.hash('senha-inexistente-nao-usada', config.bcryptRounds));
