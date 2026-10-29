// Fase 3, missão 1 (aula: hardware, os componentes internos): as peças espalhadas pelos armários da empresa.
// O Marcos dá uma lista com 8 peças (uma de cada tipo), cada uma com desenho e referências; pelos armários há peças
// parecidas, com outras referências no adesivo, para confundir. Este arquivo não depende de React nem do Phaser
// (testado com vitest).
import { HIDEOUTS } from './placas';

export type PartKind = 'hd' | 'ssd' | 'placa-mae' | 'ram' | 'processador' | 'cooler' | 'fonte' | 'placa-video';

/** Desenho grande da peça (`src/assets/pecas/<art>.png`); peças parecidas usam o mesmo desenho. */
export type PartArt =
  | 'hd-35'
  | 'hd-25'
  | 'ssd-sata'
  | 'ssd-m2'
  | 'mb-matx'
  | 'ram-ddr4'
  | 'ram-ddr3'
  | 'ram-sodimm'
  | 'cpu-am4'
  | 'cpu-lga'
  | 'cooler'
  | 'fonte'
  | 'gpu-2'
  | 'gpu-1';

export interface Part {
  id: string;
  kind: PartKind;
  art: PartArt;
  /** Linhas do adesivo: marca e modelo, o tipo, e as especificações. */
  brand: string;
  type: string;
  spec: string;
}

/** Nome do tipo na lista e nas falas, e o artigo ("a memória", "o cooler"). */
export const KINDS: Record<PartKind, { name: string; the: string; what: string }> = {
  hd: { name: 'HD (disco rígido)', the: 'o HD', what: 'Guarda os arquivos num disco que gira. Barato e com muito espaço.' },
  ssd: { name: 'SSD', the: 'o SSD', what: 'Guarda os arquivos em chips, sem peça que se mexe: muito mais rápido que o HD.' },
  'placa-mae': { name: 'Placa-mãe', the: 'a placa-mãe', what: 'Onde todas as peças se encaixam e conversam.' },
  ram: { name: 'Memória RAM', the: 'a memória', what: 'Guarda o que está sendo usado agora; apaga quando desliga.' },
  processador: { name: 'Processador (CPU)', the: 'o processador', what: 'O "cérebro": faz as contas e roda os programas.' },
  cooler: { name: 'Cooler do processador', the: 'o cooler', what: 'Dissipador com ventoinha que esfria o processador.' },
  fonte: { name: 'Fonte de alimentação', the: 'a fonte', what: 'Transforma a energia da tomada para as peças.' },
  'placa-video': { name: 'Placa de vídeo', the: 'a placa de vídeo', what: 'Cuida da imagem que aparece no monitor.' },
};

/** Ordem da lista do Marcos. */
export const PART_KINDS: PartKind[] = ['placa-mae', 'processador', 'cooler', 'ram', 'ssd', 'hd', 'fonte', 'placa-video'];

const part = (id: string, kind: PartKind, art: PartArt, brand: string, type: string, spec: string): Part => ({ id, kind, art, brand, type, spec });

/** Todas as peças escondidas: a da lista (`*-lista`) e as parecidas. As marcas são inventadas. */
export const PARTS: Part[] = [
  part('mb-lista', 'placa-mae', 'mb-matx', 'TERRA B450M', 'Micro-ATX · soquete AM4', 'Memória DDR4'),
  part('mb-lga', 'placa-mae', 'mb-matx', 'TERRA H410M', 'Micro-ATX · soquete LGA 1200', 'Memória DDR4'),
  part('cpu-lista', 'processador', 'cpu-am4', 'NUCLEO R5 3600', 'Soquete AM4', '6 núcleos · 3,6 GHz'),
  part('cpu-lga', 'processador', 'cpu-lga', 'NUCLEO i5 10400', 'Soquete LGA 1200', '6 núcleos · 2,9 GHz'),
  part('cooler-lista', 'cooler', 'cooler', 'GELO T120', 'Para soquete AM4', 'Ventoinha 120 mm'),
  part('cooler-lga', 'cooler', 'cooler', 'GELO T120i', 'Para soquete LGA 1200', 'Ventoinha 120 mm'),
  part('ram-lista', 'ram', 'ram-ddr4', 'KRONO KR8G32', 'DDR4 · 8 GB', '3200 MHz'),
  part('ram-4gb', 'ram', 'ram-ddr4', 'KRONO KR4G26', 'DDR4 · 4 GB', '2666 MHz'),
  part('ram-ddr3', 'ram', 'ram-ddr3', 'KRONO KR8G16', 'DDR3 · 8 GB', '1600 MHz'),
  part('ram-sodimm', 'ram', 'ram-sodimm', 'KRONO KS8G32', 'DDR4 SODIMM (notebook) · 8 GB', '3200 MHz'),
  part('ssd-lista', 'ssd', 'ssd-m2', 'RAPIDO NV500', 'SSD M.2 NVMe', '500 GB'),
  part('ssd-256', 'ssd', 'ssd-m2', 'RAPIDO NV256', 'SSD M.2 NVMe', '256 GB'),
  part('ssd-sata', 'ssd', 'ssd-sata', 'RAPIDO S500', 'SSD SATA 2,5"', '500 GB'),
  part('hd-lista', 'hd', 'hd-35', 'DISKAR DK1000', 'HD SATA 3,5"', '1 TB · 7200 RPM'),
  part('hd-500', 'hd', 'hd-35', 'DISKAR DK500', 'HD SATA 3,5"', '500 GB · 7200 RPM'),
  part('hd-notebook', 'hd', 'hd-25', 'DISKAR DN1000', 'HD SATA 2,5" (notebook)', '1 TB · 5400 RPM'),
  part('fonte-lista', 'fonte', 'fonte', 'VOLTZ 500B', 'Fonte ATX · 500 W', 'Selo 80 Plus Bronze'),
  part('fonte-250', 'fonte', 'fonte', 'VOLTZ 250G', 'Fonte ATX · 250 W', 'Sem selo de eficiência'),
  part('gpu-lista', 'placa-video', 'gpu-2', 'PIXEL GX4', 'PCI Express x16', '4 GB GDDR6 · 2 ventoinhas'),
  part('gpu-2gb', 'placa-video', 'gpu-1', 'PIXEL GX2', 'PCI Express x16', '2 GB GDDR5 · 1 ventoinha'),
];

export const partById = (id: string) => PARTS.find((p) => p.id === id);

/** A peça certa de cada item da lista. */
export const TARGET: Record<PartKind, Part> = Object.fromEntries(
  PART_KINDS.map((k) => [k, PARTS.find((p) => p.kind === k && p.id.endsWith('-lista'))!]),
) as Record<PartKind, Part>;

/** Referência numa linha (para as falas do Marcos e a mochila). */
export const partRef = (p: Part) => `${p.type}, ${p.spec}`;

/** Em que móvel (os mesmos esconderijos com lupa da fase 2) está cada peça; um deles tem só bagunça. */
export const PART_HIDEOUTS: { hideout: string; parts: string[] }[] = [
  { hideout: 'estante-diretoria', parts: ['cpu-lista', 'ram-ddr3', 'gpu-2gb'] },
  { hideout: 'armario-reuniao', parts: ['ssd-sata'] },
  { hideout: 'prateleira-1', parts: ['fonte-250', 'cooler-lista', 'ram-4gb'] },
  { hideout: 'prateleira-2', parts: ['hd-lista', 'cpu-lga', 'ssd-256'] },
  { hideout: 'arquivo-impressao', parts: ['mb-lga'] },
  { hideout: 'arquivo-impressao-verde', parts: [] },
  { hideout: 'bancada-copa', parts: ['ram-lista', 'hd-500'] },
  { hideout: 'arquivo-1', parts: ['gpu-lista', 'cooler-lga'] },
  { hideout: 'arquivo-2', parts: ['mb-lista', 'ram-sodimm'] },
  { hideout: 'arquivo-verde', parts: ['fonte-lista', 'hd-notebook'] },
  { hideout: 'armario-recepcao', parts: ['ssd-lista'] },
];

export const partsIn = (hideoutId: string) => PART_HIDEOUTS.find((h) => h.hideout === hideoutId)?.parts ?? [];

/** Onde a peça estava escondida ("na estante da Diretoria"). */
export function whereIs(partId: string) {
  const h = PART_HIDEOUTS.find((x) => x.parts.includes(partId));
  return HIDEOUTS.find((x) => x.id === h?.hideout)?.where ?? '';
}

/** A mochila: no máximo uma peça de cada tipo (`kind → id`). */
export type Bag = Partial<Record<PartKind, string>>;

/** O que o Marcos diz na entrega. */
export type PartsCheck =
  | { ok: false; missing: PartKind[] }
  | { ok: true; right: PartKind[]; wrong: { kind: PartKind; got: Part }[] };

/**
 * Confere a mochila com a lista. Só confere quando a mochila mais o que já foi entregue tem um de cada tipo; senão,
 * diz os tipos que faltam. `delivered` = itens já entregues certos numa entrega anterior.
 */
export function checkParts(bag: Bag, delivered: Iterable<PartKind> = []): PartsCheck {
  const done = new Set(delivered);
  const missing = PART_KINDS.filter((k) => !done.has(k) && !bag[k]);
  if (missing.length) return { ok: false, missing };
  const right: PartKind[] = [];
  const wrong: { kind: PartKind; got: Part }[] = [];
  for (const k of PART_KINDS) {
    if (done.has(k)) continue;
    const got = partById(bag[k]!)!;
    if (got.id === TARGET[k].id) right.push(k);
    else wrong.push({ kind: k, got });
  }
  return { ok: true, right, wrong };
}

/** O Marcos explica por que a peça não é a da lista. */
export function explainWrong(kind: PartKind, got: Part) {
  const want = TARGET[kind];
  const name = KINDS[kind].the;
  return `${name[0].toUpperCase()}${name.slice(1)} que você trouxe é ${partRef(got)} (${got.brand}). A da lista é ${partRef(want)} (${want.brand}).`;
}
