// Missão 6: no fim do expediente, desligar pelo sistema os computadores que ficaram ligados.
// Regras puras (sem React/Phaser), testadas com vitest.

export type OsId = 'xp' | 'win7' | 'win10' | 'win11' | 'ubuntu' | 'mint';

/** on = área de trabalho; login = tela de entrada (sessão encerrada/bloqueada); sleep = suspenso; off = desligado. */
export type PowerState = 'on' | 'login' | 'sleep' | 'off';

/** O que o ESTAGIÁRIO escolheu no menu de energia do sistema. */
export type PowerAction = 'shutdown' | 'restart' | 'sleep' | 'logoff' | 'lock';

export interface OfficePc {
  id: string;
  /** Rótulo da mesa no mapa. */
  desk: string;
  /** Onde fica, para as falas ("RH", "mesa da Ana"…). */
  place: string;
  /** Nome do usuário na tela do sistema. */
  user: string;
  os: OsId;
}

/** Os computadores que ficaram ligados no fim do dia: um de cada sistema. */
export const OFFICE_PCS: OfficePc[] = [
  { id: 'ana', desk: 'Estação 1', place: 'mesa da Ana', user: 'Ana', os: 'win10' },
  { id: 'carla', desk: 'Estação 3', place: 'mesa da Carla', user: 'Carla', os: 'win7' },
  { id: 'elisa', desk: 'Estação 5', place: 'mesa da Elisa', user: 'Elisa', os: 'win11' },
  { id: 'rh', desk: 'Mesa nova 1', place: 'RH', user: 'Rita', os: 'ubuntu' },
  { id: 'financeiro', desk: 'Mesa nova 2', place: 'Financeiro', user: 'Financeiro', os: 'mint' },
  { id: 'ti', desk: 'Mesa da TI', place: 'Sala de TI', user: 'Suporte', os: 'xp' },
];

export const OS_NAMES: Record<OsId, string> = {
  xp: 'Windows XP',
  win7: 'Windows 7',
  win10: 'Windows 10',
  win11: 'Windows 11',
  ubuntu: 'Ubuntu',
  mint: 'Linux Mint',
};

/** O caminho certo para desligar em cada sistema (a dica do modal). */
export const SHUTDOWN_HOW: Record<OsId, string> = {
  xp: 'clique em "iniciar" (o botão verde) → "Desligar o computador" → "Desativar".',
  win7: 'clique no botão Iniciar (a bolinha com a bandeira) → "Desligar".',
  win10: 'clique no botão Iniciar (canto de baixo, à esquerda) → ícone de energia ⏻ → "Desligar".',
  win11: 'clique no botão Iniciar (no meio da barra de tarefas) → ícone de energia ⏻ → "Desligar".',
  ubuntu: 'clique nos ícones do canto de cima, à direita → ⏻ → "Desligar…" → "Desligar".',
  mint: 'clique no Menu (canto de baixo, à esquerda) → ⏻ "Desligar" → "Desligar".',
};

/** Estado do computador depois de cada escolha. */
export function afterAction(action: PowerAction): PowerState {
  switch (action) {
    case 'shutdown':
      return 'off';
    case 'restart':
      return 'on';
    case 'sleep':
      return 'sleep';
    default:
      return 'login';
  }
}

export const ACTION_FEEDBACK: Record<PowerAction, string> = {
  shutdown: 'Desligou de verdade: a tela apagou e a luz do gabinete também. ✓',
  restart: 'Reiniciar desliga e liga de novo: o computador voltou ligado!',
  sleep: 'A tela apagou… mas a luzinha do gabinete está piscando: o computador só está suspenso, continua ligado.',
  logoff: 'Isso só encerrou a sessão: o computador continua ligado, na tela de entrada.',
  lock: 'Bloquear só protege a tela com senha: o computador continua ligado.',
};

export const newPowerStates = (): Record<string, PowerState> =>
  Object.fromEntries(OFFICE_PCS.map((pc) => [pc.id, 'on' as PowerState]));

/** Computadores que não estão desligados (suspenso e tela de entrada também contam: continuam ligados). */
export function stillOn(states: Record<string, PowerState>): OfficePc[] {
  return OFFICE_PCS.filter((pc) => states[pc.id] !== 'off');
}

/** Explica, para a bronca do alarme, por que um computador ainda estava ligado. */
export function describeOn(pc: OfficePc, state: PowerState): string {
  const where = `${pc.place} (${OS_NAMES[pc.os]})`;
  if (state === 'sleep') return `${where}: estava só suspenso. Suspender não desliga!`;
  if (state === 'login') return `${where}: estava na tela de entrada. Encerrar a sessão não desliga!`;
  return `${where}: continuava ligado.`;
}
