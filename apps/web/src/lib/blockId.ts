import type { DocNode } from '../types';

// crypto.randomUUID só existe em páginas seguras (https/localhost); getRandomValues funciona em http também
export function newBlockId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return 'g' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Copiar e colar um jogo duplica o blockId; a segunda cópia ganha um id novo antes de salvar
export function ensureUniqueBlockIds(doc: DocNode): DocNode {
  const seen = new Set<string>();
  return {
    ...doc,
    content: doc.content?.map((n) => {
      if (n.type !== 'gameBlock') return n;
      const id = String(n.attrs?.blockId ?? '');
      if (id && !seen.has(id)) {
        seen.add(id);
        return n;
      }
      const fresh = newBlockId();
      seen.add(fresh);
      return { ...n, attrs: { ...n.attrs, blockId: fresh } };
    }),
  };
}
