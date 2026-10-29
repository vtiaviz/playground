/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// O jsdom não calcula layout, então este teste protege uma regra de CSS que já causou um bug real:
// .cw-wrap usa container-type: inline-size (para as células escalarem com a largura) e, por isso,
// não tem largura intrínseca. Dentro do cartão de resultado (flex com align-items: center) ele
// colapsava para ~12 px, e a grade resolvida aparecia como uma tira branca.
// (Lemos o arquivo direto: com `css: false` no vitest, o CSS importado chega vazio.)
// sem comentários: o texto de um comentário não pode "cumprir" a regra
const css = readFileSync(resolve(process.cwd(), 'src/cruzadas/components/crossword.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

describe('CSS da grade', () => {
  const rule = (selector: string) => {
    const escaped = selector.replace('.', '\\.');
    const m = new RegExp(`(^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(css);
    return m ? m[2] : '';
  };

  it('.cw-wrap tem largura explícita de 100%', () => {
    const body = rule('.cw-wrap');
    expect(body).toContain('container-type: inline-size');
    expect(body).toMatch(/[^-]width:\s*100%/);
  });
});
