export const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

export const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);

export const str = (x: unknown): string => (typeof x === 'string' ? x.replace(/\s+/g, ' ').trim() : '');

// PRNG determinístico (mesmo do gerador do caça-palavras), para embaralhar alternativas
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Remove repetidos comparando sem acento e sem maiúsculas
export function uniqueBy<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((t) => {
    const k = key(t).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
