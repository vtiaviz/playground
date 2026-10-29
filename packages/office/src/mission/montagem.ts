// Missão 3: montar os dois computadores novos no RH. Primeiro cada peça vai para o lugar certo da mesa;
// depois, na parte de trás do gabinete, cada cabo vai na entrada certa. Um computador usa vídeo VGA e o
// outro HDMI.

export type ItemId = 'monitor' | 'gabinete' | 'webcam' | 'caixas' | 'teclado' | 'mouse';

export interface Item {
  id: ItemId;
  name: string;
  /** Dica quando o aluno solta a peça no lugar errado. */
  hint: string;
}

export const ITEMS: Item[] = [
  { id: 'monitor', name: 'Monitor', hint: 'O monitor fica no meio da mesa, de frente para quem vai usar o computador.' },
  { id: 'gabinete', name: 'Gabinete', hint: 'O gabinete fica ao lado do monitor, no canto da mesa, sem tapar a tela.' },
  { id: 'webcam', name: 'Webcam', hint: 'A webcam fica em cima do monitor, apontando para quem usa o computador.' },
  { id: 'caixas', name: 'Caixas de som', hint: 'As caixas de som ficam uma de cada lado do monitor.' },
  { id: 'teclado', name: 'Teclado', hint: 'O teclado fica na frente do monitor, perto da beirada da mesa.' },
  { id: 'mouse', name: 'Mouse', hint: 'O mouse fica ao lado do teclado (à direita, para quem usa a mão direita).' },
];

export const itemName = (id: ItemId) => ITEMS.find((i) => i.id === id)!.name;

/** Formato do conector: é o que decide se encaixa. */
export type Shape = 'usb' | 'vga' | 'hdmi' | 'rj45' | 'p2' | 'energia';

export type PortId = 'usb-1' | 'usb-2' | 'usb-3' | 'usb-4' | 'vga' | 'hdmi' | 'rj45' | 'p2-azul' | 'p2-verde' | 'p2-rosa' | 'energia';

export interface Port {
  id: PortId;
  shape: Shape;
  /** Nome que aparece depois de encaixar (ensina o nome da entrada). */
  name: string;
  /** Cor do anel das entradas de áudio. */
  color?: string;
}

export const P2_COLORS = { azul: '#4a7bd0', verde: '#55b04a', rosa: '#e46aa4' } as const;

export const PORTS: Port[] = [
  { id: 'usb-1', shape: 'usb', name: 'USB' },
  { id: 'usb-2', shape: 'usb', name: 'USB' },
  { id: 'usb-3', shape: 'usb', name: 'USB' },
  { id: 'usb-4', shape: 'usb', name: 'USB' },
  { id: 'vga', shape: 'vga', name: 'VGA (vídeo)' },
  { id: 'hdmi', shape: 'hdmi', name: 'HDMI (vídeo e som)' },
  { id: 'rj45', shape: 'rj45', name: 'RJ45 (rede)' },
  { id: 'p2-azul', shape: 'p2', name: 'P2 azul (entrada de linha)', color: P2_COLORS.azul },
  { id: 'p2-verde', shape: 'p2', name: 'P2 verde (saída de som)', color: P2_COLORS.verde },
  { id: 'p2-rosa', shape: 'p2', name: 'P2 rosa (microfone)', color: P2_COLORS.rosa },
  { id: 'energia', shape: 'energia', name: 'Entrada de força' },
];

export const port = (id: PortId) => PORTS.find((p) => p.id === id)!;
const USB_PORTS: PortId[] = ['usb-1', 'usb-2', 'usb-3', 'usb-4'];

export type CableId = 'video' | 'energia' | 'teclado' | 'mouse' | 'webcam' | 'microfone' | 'som' | 'rede';

export interface Cable {
  id: CableId;
  /** Nome curto (lista de cabos). */
  label: string;
  /** De onde vem o cabo, com o artigo: "Cabo do monitor", "Cabo das caixas de som"… */
  from: string;
  shape: Shape;
  /** Cor da ponta (plugues P2 são coloridos). */
  color?: string;
  /** Entradas certas. */
  accepts: PortId[];
}

export interface Kit {
  index: number;
  name: string;
  /** Sala onde fica a caixa e a mesa deste computador. */
  room: 'RH' | 'Financeiro';
  /** Cabo de vídeo que vem com o monitor deste computador. */
  video: 'vga' | 'hdmi';
  cables: Cable[];
}

function kit(index: number, room: Kit['room'], video: 'vga' | 'hdmi'): Kit {
  return {
    index,
    name: `Computador do ${room}`,
    room,
    video,
    cables: [
      { id: 'video', label: 'Monitor', from: 'do monitor', shape: video, accepts: [video] },
      { id: 'energia', label: 'Força (tomada)', from: 'de força (da tomada)', shape: 'energia', accepts: ['energia'] },
      { id: 'teclado', label: 'Teclado', from: 'do teclado', shape: 'usb', accepts: USB_PORTS },
      { id: 'mouse', label: 'Mouse', from: 'do mouse', shape: 'usb', accepts: USB_PORTS },
      { id: 'webcam', label: 'Webcam (imagem)', from: 'da webcam (imagem)', shape: 'usb', accepts: USB_PORTS },
      { id: 'microfone', label: 'Microfone da webcam', from: 'do microfone da webcam', shape: 'p2', color: P2_COLORS.rosa, accepts: ['p2-rosa'] },
      { id: 'som', label: 'Caixas de som', from: 'das caixas de som', shape: 'p2', color: P2_COLORS.verde, accepts: ['p2-verde'] },
      { id: 'rede', label: 'Rede (parede)', from: 'de rede (da parede)', shape: 'rj45', accepts: ['rj45'] },
    ],
  };
}

/** Caixa 1 (RH) → monitor com cabo VGA; caixa 2 (Financeiro) → monitor com cabo HDMI. */
export const KITS: Kit[] = [kit(0, 'RH', 'vga'), kit(1, 'Financeiro', 'hdmi')];

export const SHAPE_NAMES: Record<Shape, string> = {
  usb: 'USB',
  vga: 'VGA',
  hdmi: 'HDMI',
  rj45: 'RJ45',
  p2: 'P2',
  energia: 'força',
};

export interface KitState {
  /** Peças já colocadas na mesa. */
  placed: ItemId[];
  step: 'mesa' | 'cabos';
  /** Em que entrada cada cabo está. */
  plugs: Partial<Record<CableId, PortId>>;
  /** O aluno terminou (clicou em "Concluir montagem"). */
  done: boolean;
}

export const newKitState = (): KitState => ({ placed: [], step: 'mesa', plugs: {}, done: false });

export interface Outcome {
  state: KitState;
  ok: boolean;
  message: string;
}

/** Solta a peça `item` no lugar `slot` da mesa. Só fica se for o lugar dela. */
export function placeItem(s: KitState, item: ItemId, slot: ItemId): Outcome {
  const info = ITEMS.find((i) => i.id === item)!;
  if (s.placed.includes(item)) return { state: s, ok: false, message: `${info.name} já está na mesa.` };
  if (slot !== item) return { state: s, ok: false, message: `Aí não. ${info.hint}` };
  if (item === 'webcam' && !s.placed.includes('monitor')) {
    return { state: s, ok: false, message: 'Coloque o monitor primeiro: a webcam fica em cima dele.' };
  }
  const placed = [...s.placed, item];
  const all = placed.length === ITEMS.length;
  return {
    state: { ...s, placed },
    ok: true,
    message: all ? 'Tudo na mesa! Agora vamos ligar os cabos atrás do gabinete.' : `${info.name} no lugar!`,
  };
}

/** Encaixa o cabo na entrada. Formato diferente não encaixa; formato igual encaixa (mesmo se for a entrada errada). */
export function plugCable(k: Kit, s: KitState, cableId: CableId, portId: PortId): Outcome {
  const cable = k.cables.find((c) => c.id === cableId)!;
  const target = port(portId);
  const occupant = (Object.keys(s.plugs) as CableId[]).find((c) => s.plugs[c] === portId && c !== cableId);
  if (occupant) return { state: s, ok: false, message: 'Essa entrada já está ocupada por outro cabo.' };
  if (target.shape !== cable.shape) {
    return {
      state: s,
      ok: false,
      message: `Não encaixa! A ponta do cabo ${cable.from} tem outro formato. Compare a ponta com as entradas.`,
    };
  }
  const plugs = { ...s.plugs, [cableId]: portId };
  const all = k.cables.every((c) => plugs[c.id]);
  return {
    state: { ...s, plugs },
    ok: true,
    message: all ? 'Encaixou! Todos os cabos estão conectados.' : `Encaixou: ${target.name}.`,
  };
}

export function unplug(s: KitState, cableId: CableId): KitState {
  const plugs = { ...s.plugs };
  delete plugs[cableId];
  return { ...s, plugs, done: false };
}

export const allPlaced = (s: KitState) => ITEMS.every((i) => s.placed.includes(i.id));
export const allPlugged = (k: Kit, s: KitState) => k.cables.every((c) => s.plugs[c.id]);

/** O que a responsável do RH encontra de errado neste computador. Lista vazia = tudo certo. */
export function checkKit(k: Kit, s: KitState): string[] {
  const errors: string[] = [];
  for (const i of ITEMS) if (!s.placed.includes(i.id)) errors.push(`${i.name} ainda está na caixa.`);
  for (const c of k.cables) {
    const at = s.plugs[c.id];
    if (!at) {
      errors.push(`O cabo ${c.from} ficou desconectado.`);
      continue;
    }
    if (c.accepts.includes(at)) continue;
    const where = port(at).name;
    if (c.id === 'som') {
      errors.push(`As caixas de som estão na entrada ${where}. O som sai pela entrada verde.`);
    } else if (c.id === 'microfone') {
      errors.push(`O microfone da webcam está na entrada ${where}. Microfone vai na entrada rosa.`);
    } else {
      errors.push(`O cabo ${c.from} está na entrada ${where}, que não é a dele.`);
    }
  }
  return errors;
}
