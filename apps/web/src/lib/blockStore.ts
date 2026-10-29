import { useSyncExternalStore } from 'react';
import type { Level, LevelOutcome, Performance } from '../types';

// Estado de cada jogo na tela do aluno que muda depois que a página abriu, sem recriar o
// documento (recriar reiniciaria os outros jogos):
//  - level/config: o nível de um jogo adaptativo ainda não começado mudou;
//  - feedback: desempenho e mudança de nível depois de terminar o jogo.
export interface BlockState {
  level?: Level;
  config?: unknown;
  feedback?: { performance: Performance; level: LevelOutcome | null };
}

export interface BlockStore {
  get: (blockId: string) => BlockState | undefined;
  set: (blockId: string, patch: BlockState) => void;
  subscribe: (fn: () => void) => () => void;
}

export function createBlockStore(): BlockStore {
  const map = new Map<string, BlockState>();
  const subs = new Set<() => void>();
  return {
    get: (id) => map.get(id),
    set: (id, patch) => {
      map.set(id, { ...map.get(id), ...patch });
      subs.forEach((fn) => fn());
    },
    subscribe: (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

const none = () => () => {};
export function useBlockState(store: BlockStore | undefined, blockId: string): BlockState | undefined {
  return useSyncExternalStore(store?.subscribe ?? none, () => store?.get(blockId));
}
