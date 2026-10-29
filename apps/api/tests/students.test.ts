import { describe, expect, it } from 'vitest';
import { baseLogin, generateTempPassword, parseStudentLines, slugifyName } from '../src/lib/students';

describe('parseStudentLines', () => {
  it('lê só o nome', () => {
    const { entries, errors } = parseStudentLines('Maria da Silva');
    expect(errors).toEqual([]);
    expect(entries).toEqual([{ line: 1, name: 'Maria da Silva', email: null, registration: null }]);
  });

  it('reconhece nome, e-mail e matrícula em qualquer ordem e separador', () => {
    const text = [
      'Ana Souza; ANA@Escola.com; 2024001',
      '2024002\tBruno Lima',
      'Carla Dias, carla@escola.com',
    ].join('\n');
    const { entries, errors } = parseStudentLines(text);
    expect(errors).toEqual([]);
    expect(entries).toEqual([
      { line: 1, name: 'Ana Souza', email: 'ana@escola.com', registration: '2024001' },
      { line: 2, name: 'Bruno Lima', email: null, registration: '2024002' },
      { line: 3, name: 'Carla Dias', email: 'carla@escola.com', registration: null },
    ]);
  });

  it('ignora linhas em branco mas mantém o número real da linha', () => {
    const { entries } = parseStudentLines('\n\nDaniel Rocha\n');
    expect(entries[0].line).toBe(3);
  });

  it('aceita CRLF (texto colado do Windows/Excel)', () => {
    const { entries } = parseStudentLines('Ana Souza\r\nBruno Lima\r\n');
    expect(entries.map((e) => e.name)).toEqual(['Ana Souza', 'Bruno Lima']);
  });

  it.each([
    ['sem nome', '2024001', 'Nome não encontrado'],
    ['e-mail inválido', 'Ana Souza; ana@@x', 'E-mail inválido'],
    ['dois e-mails', 'Ana Souza; a@x.com; b@x.com', 'Mais de um e-mail'],
    ['duas matrículas', 'Ana Souza; 123; 456', 'Mais de uma matrícula'],
    ['dois nomes', 'Silva; João', 'Mais de um nome'],
  ])('reporta erro: %s', (_nome, linha, trecho) => {
    const { entries, errors } = parseStudentLines(linha);
    expect(entries).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain(trecho);
    expect(errors[0].line).toBe(1);
  });

  it('uma linha ruim não impede as boas', () => {
    const { entries, errors } = parseStudentLines('Ana Souza\n123\nBruno Lima');
    expect(entries.map((e) => e.name)).toEqual(['Ana Souza', 'Bruno Lima']);
    expect(errors.map((e) => e.line)).toEqual([2]);
  });
});

describe('slugifyName / baseLogin', () => {
  it('usa primeiro e último nome, sem acento', () => {
    expect(slugifyName('João da Silva')).toBe('joao.silva');
    expect(slugifyName('Ângela')).toBe('angela');
    expect(slugifyName('  Maria   de Lourdes  Oliveira ')).toBe('maria.oliveira');
  });

  it('prioriza e-mail, depois matrícula, depois nome', () => {
    expect(baseLogin({ name: 'Ana Souza', email: 'a@x.com', registration: '1' })).toBe('a@x.com');
    expect(baseLogin({ name: 'Ana Souza', email: null, registration: 'AB123' })).toBe('ab123');
    expect(baseLogin({ name: 'Ana Souza', email: null, registration: null })).toBe('ana.souza');
  });
});

describe('generateTempPassword', () => {
  it('tem 10 caracteres, com letra e número, sem caracteres ambíguos', () => {
    for (let i = 0; i < 300; i++) {
      const p = generateTempPassword();
      expect(p).toHaveLength(10);
      expect(p).toMatch(/[A-Za-z]/);
      expect(p).toMatch(/[0-9]/);
      expect(p).not.toMatch(/[0O1lI]/);
    }
  });

  it('não repete', () => {
    const set = new Set(Array.from({ length: 200 }, () => generateTempPassword()));
    expect(set.size).toBe(200);
  });
});
