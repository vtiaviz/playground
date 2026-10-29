import { useSyncExternalStore } from 'react';
import type { GameFocus } from '@playground/games';
import { api } from '../api';
import type { TutorStatus } from '../types';

export type TutorTrigger = 'button' | 'idle' | 'message';

export interface TutorTurn {
  role: 'student' | 'tutor';
  text: string;
}

export interface TutorAsk {
  blockId: string;
  gameType: string;
  config: unknown;
  focus: GameFocus;
  trigger: TutorTrigger;
  message?: string;
  history: TutorTurn[]; // conversa anterior neste item (o servidor do aluno usa a dele, do banco)
}

// Como o bloco de jogo fala com o tutor: o aluno usa a rota da atividade (o servidor sabe a
// configuração); a pré-visualização do instrutor manda a configuração do editor.
export interface TutorAdapter {
  idleSeconds: number; // 0 = não oferece ajuda sozinho
  // texto curto sobre o que a ajuda custa (aparece no rodapé do painel)
  note: string;
  ask: (req: TutorAsk) => Promise<{ reply: string }>;
}

// O status do tutor chega depois que a página abre; o editor (e os blocos) são criados uma vez só.
export interface TutorHandle {
  get: () => TutorAdapter | null;
  set: (a: TutorAdapter | null) => void;
  subscribe: (fn: () => void) => () => void;
}

export function createTutorHandle(): TutorHandle {
  let current: TutorAdapter | null = null;
  const subs = new Set<() => void>();
  return {
    get: () => current,
    set: (a) => {
      current = a;
      subs.forEach((fn) => fn());
    },
    subscribe: (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

const none = () => () => {};
export function useTutor(handle: TutorHandle | undefined): TutorAdapter | null {
  return useSyncExternalStore(handle?.subscribe ?? none, () => handle?.get() ?? null);
}

export function studentTutor(activityId: string, status: TutorStatus): TutorAdapter | null {
  if (!status.enabled) return null;
  return {
    idleSeconds: status.idleSeconds,
    note: 'O tutor dá pistas, não a resposta. Pedir ajuda não tira pontos da nota; conta só um pouquinho no seu nível.',
    ask: ({ blockId, focus, trigger, message }) =>
      api(`/student/activities/${activityId}/tutor`, { body: { blockId, item: focus.item, state: focus.state, trigger, message } }),
  };
}

export function previewTutor(status: TutorStatus): TutorAdapter | null {
  if (!status.enabled) return null;
  return {
    idleSeconds: status.idleSeconds,
    note: 'Pré-visualização: nada é gravado. Para o aluno, cada ajuda desconta um pouco do desempenho (não da nota).',
    ask: ({ gameType, config, focus, trigger, message, history }) =>
      api('/ai/tutor', { body: { gameType, config, item: focus.item, state: focus.state, trigger, message, history } }),
  };
}
