// Fase 3, missão 3: montar os 3 computadores do Marcos (estudante, gamer e escritório). Cada caixa traz só as peças
// daquele computador: o desafio é arrastar cada uma para o lugar certo do gabinete, ligar os cabos de energia e de
// dados (SATA) e apertar o botão de ligar. Este arquivo não depende de React nem do Phaser (testado com vitest).

export type BuildId = 'estudante' | 'gamer' | 'escritorio';

/** Tipo de peça da caixa (onde ela encaixa). */
export type PieceKind = 'gabinete' | 'placa-mae' | 'processador' | 'cooler' | 'ram' | 'placa-video' | 'fonte' | 'hd' | 'ssd';

/** Lugar na bancada onde uma peça encaixa (a memória tem dois slots). */
export type SlotId = 'gabinete' | 'placa-mae' | 'processador' | 'cooler' | 'ram-0' | 'ram-1' | 'placa-video' | 'fonte' | 'hd' | 'ssd';

/** Desenho grande da peça na mochila (`src/assets/pecas/*` ou `src/assets/montar/*-icone.png`). */
export type PieceIcon = 'gabinete' | 'gabinete-gamer' | 'mb-matx' | 'cpu-lga' | 'cooler' | 'ram-ddr4' | 'gpu-2' | 'fonte' | 'hd-35' | 'ssd-sata';

export interface Piece {
  id: string;
  kind: PieceKind;
  /** Nome curto na mochila ("Processador i3"). */
  name: string;
  /** Especificação ("NUCLEO i3 · 4 núcleos"). */
  spec: string;
  icon: PieceIcon;
}

export interface Build {
  id: BuildId;
  /** "Computador do estudante". */
  title: string;
  /** O pedido em uma linha ("i3 · 8 GB · HD 512 GB"). */
  order: string;
  gamer: boolean;
  pieces: Piece[];
}

const piece = (id: string, kind: PieceKind, name: string, spec: string, icon: PieceIcon): Piece => ({ id, kind, name, spec, icon });
const board = (b: BuildId) => piece(`${b}-mae`, 'placa-mae', 'Placa-mãe', 'Micro-ATX · 2 slots de memória', 'mb-matx');
const cooler = (b: BuildId) => piece(`${b}-cooler`, 'cooler', 'Cooler', 'Para o processador', 'cooler');

/** Os 3 computadores, na ordem das caixas. As marcas são inventadas. */
export const BUILDS: Build[] = [
  {
    id: 'estudante',
    title: 'Computador do estudante',
    order: 'i3 · 8 GB de memória · HD 512 GB',
    gamer: false,
    pieces: [
      piece('estudante-gabinete', 'gabinete', 'Gabinete', 'Torre ATX', 'gabinete'),
      board('estudante'),
      piece('estudante-cpu', 'processador', 'Processador i3', 'NUCLEO i3 · 4 núcleos', 'cpu-lga'),
      cooler('estudante'),
      piece('estudante-ram', 'ram', 'Memória 8 GB', 'DDR4 · 8 GB', 'ram-ddr4'),
      piece('estudante-hd', 'hd', 'HD 512 GB', 'HD SATA 3,5"', 'hd-35'),
      piece('estudante-fonte', 'fonte', 'Fonte 350 W', 'Fonte ATX', 'fonte'),
    ],
  },
  {
    id: 'gamer',
    title: 'Computador gamer',
    order: 'i7 · 32 GB de memória · SSD 512 GB · placa de vídeo · fonte 500 W · gabinete gamer',
    gamer: true,
    pieces: [
      piece('gamer-gabinete', 'gabinete', 'Gabinete gamer', 'Torre ATX com luzes', 'gabinete-gamer'),
      board('gamer'),
      piece('gamer-cpu', 'processador', 'Processador i7', 'NUCLEO i7 · 8 núcleos', 'cpu-lga'),
      cooler('gamer'),
      piece('gamer-ram-a', 'ram', 'Memória 16 GB', 'DDR4 · 16 GB (1 de 2)', 'ram-ddr4'),
      piece('gamer-ram-b', 'ram', 'Memória 16 GB', 'DDR4 · 16 GB (2 de 2)', 'ram-ddr4'),
      piece('gamer-ssd', 'ssd', 'SSD 512 GB', 'SSD SATA 2,5"', 'ssd-sata'),
      piece('gamer-gpu', 'placa-video', 'Placa de vídeo', '8 GB · 2 ventoinhas', 'gpu-2'),
      piece('gamer-fonte', 'fonte', 'Fonte 500 W', 'Fonte ATX', 'fonte'),
    ],
  },
  {
    id: 'escritorio',
    title: 'Computador do escritório',
    order: 'i5 · 16 GB de memória · SSD 256 GB + HD 512 GB',
    gamer: false,
    pieces: [
      piece('escritorio-gabinete', 'gabinete', 'Gabinete', 'Torre ATX', 'gabinete'),
      board('escritorio'),
      piece('escritorio-cpu', 'processador', 'Processador i5', 'NUCLEO i5 · 6 núcleos', 'cpu-lga'),
      cooler('escritorio'),
      piece('escritorio-ram-a', 'ram', 'Memória 8 GB', 'DDR4 · 8 GB (1 de 2)', 'ram-ddr4'),
      piece('escritorio-ram-b', 'ram', 'Memória 8 GB', 'DDR4 · 8 GB (2 de 2)', 'ram-ddr4'),
      piece('escritorio-ssd', 'ssd', 'SSD 256 GB', 'SSD SATA 2,5"', 'ssd-sata'),
      piece('escritorio-hd', 'hd', 'HD 512 GB', 'HD SATA 3,5"', 'hd-35'),
      piece('escritorio-fonte', 'fonte', 'Fonte 400 W', 'Fonte ATX', 'fonte'),
    ],
  },
];

export const buildById = (id: BuildId) => BUILDS.find((b) => b.id === id)!;
export const pieceOf = (build: Build, id: string) => build.pieces.find((p) => p.id === id);

/** Onde cada tipo de peça encaixa. */
export const SLOTS_OF: Record<PieceKind, SlotId[]> = {
  gabinete: ['gabinete'],
  'placa-mae': ['placa-mae'],
  processador: ['processador'],
  cooler: ['cooler'],
  ram: ['ram-0', 'ram-1'],
  'placa-video': ['placa-video'],
  fonte: ['fonte'],
  hd: ['hd'],
  ssd: ['ssd'],
};

/** Ordem de desenhar as peças encaixadas (de trás para a frente). */
export const SLOT_ORDER: SlotId[] = ['gabinete', 'placa-mae', 'fonte', 'hd', 'ssd', 'processador', 'cooler', 'ram-0', 'ram-1', 'placa-video'];

/** Dica quando a peça é solta no lugar errado. */
export const PLACE_HINT: Record<PieceKind, string> = {
  gabinete: 'O gabinete vai em cima da mesa: é a caixa onde todas as peças ficam.',
  'placa-mae': 'A placa-mãe é presa na chapa do fundo do gabinete, no espaço grande do meio.',
  processador: 'O processador vai no soquete: o quadrado de metal no meio da placa-mãe.',
  cooler: 'O cooler vai em cima do processador, para esfriar ele.',
  ram: 'A memória vai nos slots compridos e finos, ao lado do soquete do processador.',
  'placa-video': 'A placa de vídeo vai no slot PCI Express: o slot comprido e deitado na parte de baixo da placa-mãe.',
  fonte: 'A fonte fica no espaço de baixo, no fundo do gabinete.',
  hd: 'O HD vai na baia de disco maior, na frente do gabinete.',
  ssd: 'O SSD vai na baia pequena, na frente do gabinete, embaixo da do HD.',
};

/** Nome da peça nas falas ("o processador"). */
export const THE: Record<PieceKind, string> = {
  gabinete: 'o gabinete',
  'placa-mae': 'a placa-mãe',
  processador: 'o processador',
  cooler: 'o cooler',
  ram: 'a memória',
  'placa-video': 'a placa de vídeo',
  fonte: 'a fonte',
  hd: 'o HD',
  ssd: 'o SSD',
};

// ---------------------------------------------------------------- cabos

export type PortId =
  | 'psu-24'
  | 'psu-sata-0'
  | 'psu-sata-1'
  | 'psu-pcie'
  | 'mb-24'
  | 'mb-sata-0'
  | 'mb-sata-1'
  | 'hd-power'
  | 'hd-data'
  | 'ssd-power'
  | 'ssd-data'
  | 'gpu-power';

/** Tipo do conector: energia da placa-mãe (24 pinos), energia SATA, dados SATA, energia PCI Express. */
export type CableType = 'p24' | 'spow' | 'sdata' | 'pcie';

export interface PortInfo {
  type: CableType;
  /** Lado de onde o cabo sai (fonte, ou a porta SATA da placa-mãe) ou lado que recebe (a peça). */
  side: 'source' | 'device';
  /** Peça que precisa estar encaixada para a porta aparecer. */
  on: SlotId;
  what: string;
}

export const PORTS: Record<PortId, PortInfo> = {
  'psu-24': { type: 'p24', side: 'source', on: 'fonte', what: 'o cabo de 24 pinos da fonte' },
  'psu-sata-0': { type: 'spow', side: 'source', on: 'fonte', what: 'um cabo de energia SATA da fonte' },
  'psu-sata-1': { type: 'spow', side: 'source', on: 'fonte', what: 'um cabo de energia SATA da fonte' },
  'psu-pcie': { type: 'pcie', side: 'source', on: 'fonte', what: 'o cabo de energia PCI Express da fonte' },
  'mb-24': { type: 'p24', side: 'device', on: 'placa-mae', what: 'a entrada de energia da placa-mãe' },
  'mb-sata-0': { type: 'sdata', side: 'source', on: 'placa-mae', what: 'uma porta SATA da placa-mãe' },
  'mb-sata-1': { type: 'sdata', side: 'source', on: 'placa-mae', what: 'uma porta SATA da placa-mãe' },
  'hd-power': { type: 'spow', side: 'device', on: 'hd', what: 'a entrada de energia do HD' },
  'hd-data': { type: 'sdata', side: 'device', on: 'hd', what: 'a entrada de dados do HD' },
  'ssd-power': { type: 'spow', side: 'device', on: 'ssd', what: 'a entrada de energia do SSD' },
  'ssd-data': { type: 'sdata', side: 'device', on: 'ssd', what: 'a entrada de dados do SSD' },
  'gpu-power': { type: 'pcie', side: 'device', on: 'placa-video', what: 'a entrada de energia da placa de vídeo' },
};

/** Para que serve cada tipo de cabo (dica quando o cabo não encaixa). */
export const CABLE_HINT: Record<CableType, string> = {
  p24: 'O cabo de 24 pinos leva a energia da fonte para a placa-mãe.',
  spow: 'A energia SATA sai da fonte e vai na entrada larga do HD ou do SSD.',
  sdata: 'O cabo de dados SATA liga a placa-mãe à entrada estreita do HD ou do SSD.',
  pcie: 'O cabo PCI Express leva energia da fonte para a placa de vídeo.',
};

/** Nome do cabo na legenda. */
export const CABLE_NAME: Record<CableType, string> = {
  p24: 'Energia da placa-mãe (24 pinos)',
  spow: 'Energia SATA',
  sdata: 'Dados SATA',
  pcie: 'Energia da placa de vídeo',
};

export type Cable = [PortId, PortId];

export interface BuildState {
  /** Peça encaixada em cada lugar (id da peça). */
  installed: Partial<Record<SlotId, string>>;
  cables: Cable[];
  /** Ligou e apareceu a tela de inicialização. */
  booted: boolean;
}

export const newBuildState = (): BuildState => ({ installed: {}, cables: [], booted: false });

/** Peças que ainda estão na caixa (mochila). */
export const inBox = (build: Build, s: BuildState) => build.pieces.filter((p) => !Object.values(s.installed).includes(p.id));

/** A porta aparece quando a peça dela está encaixada. */
export const portVisible = (s: BuildState, port: PortId) => !!s.installed[PORTS[port].on];

const portUsed = (s: BuildState, port: PortId) => s.cables.some((c) => c.includes(port));

export type Attempt = { ok: true; state: BuildState; slot?: SlotId } | { ok: false; reason: string };

/** O que precisa estar encaixado antes (e a frase do Marcos se não estiver). */
function missingBefore(kind: PieceKind, s: BuildState): string | null {
  if (kind !== 'gabinete' && !s.installed.gabinete) return 'Primeiro coloque o gabinete na mesa.';
  if ((kind === 'processador' || kind === 'ram' || kind === 'placa-video') && !s.installed['placa-mae'])
    return `Primeiro encaixe a placa-mãe: ${THE[kind]} vai nela.`;
  if (kind === 'cooler' && !s.installed.processador) return 'O cooler vai em cima do processador: encaixe o processador primeiro.';
  return null;
}

/**
 * Soltou a peça em cima de `slot` (ou em nenhum lugar da bancada, `null`). Encaixa se for o lugar dela e o que vem
 * antes já estiver encaixado; senão diz por quê.
 */
export function tryPlace(build: Build, s: BuildState, pieceId: string, slot: SlotId | null): Attempt {
  const p = pieceOf(build, pieceId);
  if (!p || Object.values(s.installed).includes(pieceId)) return { ok: false, reason: '' };
  const before = missingBefore(p.kind, s);
  const free = SLOTS_OF[p.kind].filter((sl) => !s.installed[sl]);
  if (!slot || !SLOTS_OF[p.kind].includes(slot)) return { ok: false, reason: before ?? PLACE_HINT[p.kind] };
  if (before) return { ok: false, reason: before };
  // memória: se soltou num slot ocupado, vai para o outro livre
  const target = s.installed[slot] ? free[0] : slot;
  if (!target) return { ok: false, reason: 'Esse lugar já está ocupado.' };
  return { ok: true, slot: target, state: { ...s, installed: { ...s.installed, [target]: pieceId }, booted: false } };
}

/** Ligou um cabo de `a` até `b`: encaixa se for o mesmo tipo, de uma saída até uma entrada, com as duas livres. */
export function tryCable(s: BuildState, a: PortId, b: PortId): Attempt {
  if (a === b || !portVisible(s, a) || !portVisible(s, b)) return { ok: false, reason: '' };
  if (portUsed(s, a) || portUsed(s, b)) return { ok: false, reason: 'Essa porta já tem um cabo ligado.' };
  const A = PORTS[a];
  const B = PORTS[b];
  if (A.type !== B.type) return { ok: false, reason: `Não encaixa: ${A.what} não serve n${B.what}. ${CABLE_HINT[A.type]}` };
  if (A.side === B.side) return { ok: false, reason: CABLE_HINT[A.type] };
  return { ok: true, state: { ...s, cables: [...s.cables, A.side === 'source' ? [a, b] : [b, a]], booted: false } };
}

/** Cabos que o computador precisa (por tipo e peça). */
function neededCables(build: Build): { device: PortId; text: string }[] {
  const kinds = new Set(build.pieces.map((p) => p.kind));
  const out: { device: PortId; text: string }[] = [{ device: 'mb-24', text: 'o cabo de energia da placa-mãe (24 pinos)' }];
  for (const d of ['hd', 'ssd'] as const) {
    if (!kinds.has(d)) continue;
    const name = d === 'hd' ? 'HD' : 'SSD';
    out.push({ device: `${d}-power`, text: `a energia do ${name}` }, { device: `${d}-data`, text: `o cabo de dados SATA do ${name}` });
  }
  if (kinds.has('placa-video')) out.push({ device: 'gpu-power', text: 'a energia da placa de vídeo' });
  return out;
}

/** O que falta para ligar: peças fora do lugar e cabos soltos (vazio = liga). */
export function missingForBoot(build: Build, s: BuildState): string[] {
  const out = inBox(build, s).map((p) => `encaixar ${THE[p.kind]}${p.kind === 'ram' ? ` (${p.name})` : ''}`);
  for (const c of neededCables(build)) if (!portUsed(s, c.device)) out.push(`ligar ${c.text}`);
  return out;
}

/** Apertou o botão de ligar. */
export function tryBoot(build: Build, s: BuildState): Attempt {
  if (!s.installed.gabinete) return { ok: false, reason: 'Ainda não tem computador na mesa: comece colocando o gabinete.' };
  const missing = missingForBoot(build, s);
  if (missing.length) {
    const list = missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(', ')} e ${missing[missing.length - 1]}`;
    return { ok: false, reason: `O computador não ligou. Falta ${list}.` };
  }
  return { ok: true, state: { ...s, booted: true } };
}
