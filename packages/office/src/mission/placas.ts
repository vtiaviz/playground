// Fase 2, missão 3: as 10 placas de desenvolvimento (Arduino e Raspberry Pi) escondidas nos armários da empresa.
// Em cada móvel com uma lupa em cima o ESTAGIÁRIO procura; algumas placas caem no chão com a bagunça e ele coleta.
// No fim, entrega as 10 ao Marcos, na Sala de TI. Este arquivo não depende de React nem do Phaser (testado com vitest).
import type { RoomId } from '../game/map';

export type BoardFamily = 'arduino' | 'raspberry';

export type BoardModel =
  | 'arduino-uno'
  | 'arduino-nano'
  | 'arduino-mega'
  | 'raspberry-pi-4'
  | 'raspberry-pi-zero'
  | 'raspberry-pi-pico';

export interface BoardInfo {
  id: BoardModel;
  family: BoardFamily;
  /** Nome no destaque (ex.: "Arduino Uno"). */
  name: string;
  /** Que tipo de placa é, numa linha (aparece embaixo do nome). */
  kind: string;
  /** Para o aluno reconhecer a placa. */
  what: string;
}

export const BOARDS: Record<BoardModel, BoardInfo> = {
  'arduino-uno': {
    id: 'arduino-uno',
    family: 'arduino',
    name: 'Arduino Uno',
    kind: 'Microcontrolador',
    what: 'A placa azul mais usada para aprender. Roda um programa só, gravado pelo cabo USB, para ler sensores e ligar LEDs, motores e buzinas.',
  },
  'arduino-nano': {
    id: 'arduino-nano',
    family: 'arduino',
    name: 'Arduino Nano',
    kind: 'Microcontrolador',
    what: 'O mesmo que o Uno faz, numa placa do tamanho de um dedo: cabe em projetos pequenos e encaixa direto na protoboard.',
  },
  'arduino-mega': {
    id: 'arduino-mega',
    family: 'arduino',
    name: 'Arduino Mega',
    kind: 'Microcontrolador',
    what: 'O Arduino grande, com muito mais pinos: para projetos com muitos sensores e motores, como robôs e impressoras 3D.',
  },
  'raspberry-pi-4': {
    id: 'raspberry-pi-4',
    family: 'raspberry',
    name: 'Raspberry Pi 4',
    kind: 'Computador numa placa',
    what: 'Um computador inteiro do tamanho de um cartão: processador, memória, USB, rede e saída de vídeo. Liga num monitor e roda Linux!',
  },
  'raspberry-pi-zero': {
    id: 'raspberry-pi-zero',
    family: 'raspberry',
    name: 'Raspberry Pi Zero',
    kind: 'Computador numa placa',
    what: 'O Raspberry Pi menor e mais barato. Mesmo pequeno, é um computador completo, com sistema operacional.',
  },
  'raspberry-pi-pico': {
    id: 'raspberry-pi-pico',
    family: 'raspberry',
    name: 'Raspberry Pi Pico',
    kind: 'Microcontrolador',
    what: 'Pegadinha! Apesar do nome Raspberry, o Pico é um microcontrolador, como o Arduino: roda um programa só, sem sistema operacional.',
  },
};

/** Um móvel com lupa: onde procurar e as placas que estão lá dentro (vazio = só bagunça). */
export interface Hideout {
  id: string;
  room: RoomId;
  /** Rótulo do móvel no mapa e qual deles (os arquivos são vários). */
  host: string;
  nth: number;
  /** "na estante da Diretoria" (para as mensagens). */
  where: string;
  boards: BoardModel[];
}

export const HIDEOUTS: Hideout[] = [
  { id: 'estante-diretoria', room: 'diretoria', host: 'Estante', nth: 0, where: 'na estante da Diretoria', boards: ['raspberry-pi-4'] },
  { id: 'armario-reuniao', room: 'reunioes', host: 'Armário da reunião', nth: 0, where: 'no armário da Sala de Reuniões', boards: ['raspberry-pi-zero'] },
  { id: 'prateleira-1', room: 'impressao', host: 'Prateleira', nth: 0, where: 'na prateleira do Almoxarifado', boards: [] },
  { id: 'prateleira-2', room: 'impressao', host: 'Prateleira', nth: 1, where: 'na prateleira do Almoxarifado', boards: ['arduino-uno', 'arduino-nano'] },
  { id: 'arquivo-impressao', room: 'impressao', host: 'Arquivo', nth: 0, where: 'no arquivo do Almoxarifado', boards: ['raspberry-pi-pico'] },
  { id: 'arquivo-impressao-verde', room: 'impressao', host: 'Arquivo', nth: 2, where: 'no arquivo verde do Almoxarifado', boards: [] },
  { id: 'bancada-copa', room: 'copa', host: 'Bancada', nth: 0, where: 'na bancada da Copa', boards: ['arduino-nano'] },
  { id: 'arquivo-1', room: 'arquivo', host: 'Arquivo', nth: 3, where: 'no arquivo da sala do Arquivo', boards: ['arduino-mega'] },
  { id: 'arquivo-2', room: 'arquivo', host: 'Arquivo', nth: 4, where: 'no arquivo da sala do Arquivo', boards: ['raspberry-pi-zero'] },
  { id: 'arquivo-verde', room: 'arquivo', host: 'Arquivo', nth: 5, where: 'no arquivo verde da sala do Arquivo', boards: ['arduino-uno'] },
  { id: 'armario-recepcao', room: 'recepcao', host: 'Armário', nth: 0, where: 'no armário da Recepção', boards: ['raspberry-pi-4'] },
];

/** Uma placa escondida: `id` = "<esconderijo>:<n>". */
export interface HiddenBoard {
  id: string;
  model: BoardModel;
  hideout: string;
}

export const HIDDEN_BOARDS: HiddenBoard[] = HIDEOUTS.flatMap((h) => h.boards.map((model, k) => ({ id: `${h.id}:${k}`, model, hideout: h.id })));

export const BOARD_TOTAL = HIDDEN_BOARDS.length;

export const boardById = (id: string) => HIDDEN_BOARDS.find((b) => b.id === id);

/** Quantas placas de cada família foram escondidas. */
export function familyCount(boards: HiddenBoard[] = HIDDEN_BOARDS): Record<BoardFamily, number> {
  const out: Record<BoardFamily, number> = { arduino: 0, raspberry: 0 };
  for (const b of boards) out[BOARDS[b.model].family]++;
  return out;
}

/** O que o Marcos diz quando o ESTAGIÁRIO chega com placas faltando. */
export type DeliveryCheck = { ok: true } | { ok: false; got: number; missing: number; allSearched: boolean };

export function checkDelivery(collected: number, searched: number): DeliveryCheck {
  if (collected >= BOARD_TOTAL) return { ok: true };
  return { ok: false, got: collected, missing: BOARD_TOTAL - collected, allSearched: searched >= HIDEOUTS.length };
}
