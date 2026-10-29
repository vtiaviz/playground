import { randomInt } from 'node:crypto';

// Máximo de alunos por importação / por "gerar novas senhas" (o hash bcrypt de cada senha custa CPU)
export const MAX_BATCH = 150;

export interface ParsedStudent {
  line: number;
  name: string;
  email: string | null;
  registration: string | null;
}

export interface ParseError {
  line: number;
  text: string;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGISTRATION_RE = /^[A-Za-z0-9._-]+$/;

type LineResult = { ok: true; value: Omit<ParsedStudent, 'line'> } | { ok: false; message: string };

// Aceita, por linha, campos em qualquer ordem: nome, e-mail e/ou matrícula.
// Separador: Tab (colar de planilha), senão ";", senão ",".
//   Maria da Silva
//   Maria da Silva; maria@escola.com; 2024001
//   2024001<TAB>Maria da Silva
function parseLine(raw: string): LineResult {
  const sep = raw.includes('\t') ? '\t' : raw.includes(';') ? ';' : ',';
  const parts = raw
    .split(sep)
    .map((p) => p.trim())
    .filter(Boolean);

  let name = '';
  let email: string | null = null;
  let registration: string | null = null;

  for (const part of parts) {
    if (part.includes('@')) {
      if (!EMAIL_RE.test(part)) return { ok: false, message: `E-mail inválido: "${part}"` };
      if (email) return { ok: false, message: 'Mais de um e-mail na mesma linha' };
      email = part.toLowerCase();
    } else if (REGISTRATION_RE.test(part) && /\d/.test(part)) {
      if (registration) return { ok: false, message: 'Mais de uma matrícula na mesma linha' };
      if (part.length > 30) return { ok: false, message: 'Matrícula muito longa (máx. 30 caracteres)' };
      registration = part;
    } else {
      if (name) {
        return { ok: false, message: 'Mais de um nome na linha (separe os campos com ";" ou Tab)' };
      }
      name = part.replace(/\s+/g, ' ');
    }
  }

  if (!name) return { ok: false, message: 'Nome não encontrado' };
  if (!/\p{L}/u.test(name)) return { ok: false, message: 'Nome inválido' };
  if (name.length < 2 || name.length > 100) return { ok: false, message: 'Nome deve ter de 2 a 100 caracteres' };

  return { ok: true, value: { name, email, registration } };
}

export function parseStudentLines(text: string): { entries: ParsedStudent[]; errors: ParseError[] } {
  const entries: ParsedStudent[] = [];
  const errors: ParseError[] = [];

  text.split(/\r?\n/).forEach((raw, i) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const r = parseLine(trimmed);
    if (r.ok) entries.push({ line: i + 1, ...r.value });
    else errors.push({ line: i + 1, text: trimmed, message: r.message });
  });

  return { entries, errors };
}

// "João da Silva" -> "joao.silva" (primeiro + último nome, sem acentos)
export function slugifyName(name: string): string {
  const words = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  if (words.length === 0) return 'aluno';
  if (words.length === 1) return words[0];
  return `${words[0]}.${words[words.length - 1]}`;
}

// Login base de um aluno: e-mail > matrícula > nome. (Sempre minúsculo.)
export function baseLogin(s: Pick<ParsedStudent, 'name' | 'email' | 'registration'>): string {
  return s.email ?? s.registration?.toLowerCase() ?? slugifyName(s.name);
}

// Senha temporária aleatória (sem caracteres ambíguos como 0/O e 1/l/I).
// Sempre tem ao menos uma letra e um número.
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
const DIGITS = '23456789';
export function generateTempPassword(length = 10): string {
  const alphabet = LETTERS + DIGITS;
  for (;;) {
    let out = '';
    for (let i = 0; i < length; i++) out += alphabet[randomInt(alphabet.length)];
    if (/[A-Za-z]/.test(out) && /[0-9]/.test(out)) return out;
  }
}
