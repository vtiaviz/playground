import { createContext, useContext } from 'react';

// Vários jogos podem ficar na mesma página (uma aula com forca + quiz, por exemplo).
// Os atalhos de teclado físico só valem para UM deles: o que o aluno tocou por último
// (ou o único que existe na página).

export interface GameInstance {
  isActive: () => boolean;
}

// Fora de um <ShadowHost> (testes, uso isolado) o jogo se considera sempre ativo
export const GameInstanceContext = createContext<GameInstance>({ isActive: () => true });
export const useGameInstance = () => useContext(GameInstanceContext);

const mounted = new Set<symbol>();
let active: symbol | null = null;

export function registerInstance(id: symbol): () => void {
  mounted.add(id);
  return () => {
    mounted.delete(id);
    if (active === id) active = null;
  };
}

export const activateInstance = (id: symbol) => {
  active = id;
};

export const isInstanceActive = (id: symbol) => mounted.size <= 1 || active === id;

// `event.target` num listener da janela é só o "host" do Shadow DOM; o alvo verdadeiro
// é o primeiro item do composedPath.
export function realTarget(e: Event): HTMLElement | null {
  const first = e.composedPath?.()[0];
  return first instanceof HTMLElement ? first : (e.target as HTMLElement | null);
}

export function isEditable(el: HTMLElement | null): boolean {
  return (
    !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
  );
}
