// Fase 4, missão 1: instalar o projetor e a webcam na Sala de Reuniões para a vídeo chamada (o Marcos faltou). A caixa
// traz o projetor, o cabo VGA, o cabo de força e a webcam: o desafio é pôr cada coisa na mesa, ligar cada ponta no
// lugar certo (notebook, projetor e tomada), ligar, acertar o foco da imagem na parede e testar a câmera.
// Este arquivo não depende de React nem do Phaser (testado com vitest).

export type ItemId = 'projetor' | 'vga' | 'forca' | 'webcam';

export interface Item {
  id: ItemId;
  /** Nome curto na caixa ("Cabo VGA"). */
  name: string;
  spec: string;
  /** Nome nas falas ("o cabo VGA"). */
  the: string;
}

export const ITEMS: Item[] = [
  { id: 'projetor', name: 'Projetor', spec: 'Entradas VGA, HDMI e de energia na traseira', the: 'o projetor' },
  { id: 'vga', name: 'Cabo VGA', spec: 'Conector azul de 15 pinos nas duas pontas', the: 'o cabo VGA' },
  { id: 'forca', name: 'Cabo de força', spec: 'Plugue de tomada numa ponta e conector do projetor na outra', the: 'o cabo de força' },
  { id: 'webcam', name: 'Webcam', spec: 'Câmera USB com presilha, para prender na tela', the: 'a webcam' },
];

export const itemById = (id: ItemId) => ITEMS.find((i) => i.id === id)!;

/** Onde a coisa foi solta: no lugar marcado do projetor, em cima da tela (webcam), em outro ponto da mesa ou fora. */
export type DropTarget = 'projetor' | 'webcam' | 'mesa' | null;

/** Dica quando a coisa é solta no lugar errado. */
export const PLACE_HINT: Record<ItemId, string> = {
  projetor: 'O projetor fica na mesa, no espaço marcado à direita, com a lente virada para a parede.',
  webcam: 'A webcam fica presa em cima da tela do notebook (no espaço marcado), olhando para quem está na reunião.',
  vga: 'Solte o cabo VGA em cima da mesa; depois ligue as pontas.',
  forca: 'Solte o cabo de força em cima da mesa; depois ligue as pontas.',
};

// ---------------------------------------------------------------- pontas e entradas

/** Formato do conector: VGA (azul, trapézio), HDMI, USB, energia do projetor e plugue de tomada. */
export type PlugKind = 'vga' | 'hdmi' | 'usb' | 'energia' | 'tomada';

export type PlugId = 'vga-a' | 'vga-b' | 'forca-plugue' | 'forca-conector' | 'webcam-usb';
export type PortId = 'nb-usb' | 'nb-hdmi' | 'nb-vga' | 'pj-vga' | 'pj-hdmi' | 'pj-power' | 'tomada';

export const PLUGS: Record<PlugId, { item: ItemId; kind: PlugKind; what: string }> = {
  'vga-a': { item: 'vga', kind: 'vga', what: 'a ponta do cabo VGA' },
  'vga-b': { item: 'vga', kind: 'vga', what: 'a ponta do cabo VGA' },
  'forca-plugue': { item: 'forca', kind: 'tomada', what: 'o plugue do cabo de força' },
  'forca-conector': { item: 'forca', kind: 'energia', what: 'o conector do cabo de força' },
  'webcam-usb': { item: 'webcam', kind: 'usb', what: 'o cabo USB da webcam' },
};

export const PORTS: Record<PortId, { on: 'notebook' | 'projetor' | 'parede'; kind: PlugKind; what: string }> = {
  'nb-usb': { on: 'notebook', kind: 'usb', what: 'a entrada USB do notebook' },
  'nb-hdmi': { on: 'notebook', kind: 'hdmi', what: 'a entrada HDMI do notebook' },
  'nb-vga': { on: 'notebook', kind: 'vga', what: 'a entrada VGA do notebook' },
  'pj-vga': { on: 'projetor', kind: 'vga', what: 'a entrada VGA do projetor' },
  'pj-hdmi': { on: 'projetor', kind: 'hdmi', what: 'a entrada HDMI do projetor' },
  'pj-power': { on: 'projetor', kind: 'energia', what: 'a entrada de energia do projetor' },
  tomada: { on: 'parede', kind: 'tomada', what: 'a tomada da parede' },
};

/** Para onde vai cada tipo de ponta (dica quando não encaixa). */
export const PLUG_HINT: Record<Exclude<PlugKind, 'hdmi'>, string> = {
  vga: 'O conector VGA é azul, em forma de trapézio, com 15 pinos: vai na entrada VGA (azul) do notebook e na do projetor. HDMI é outro formato.',
  usb: 'O cabo da webcam é USB: vai na entrada USB do notebook, a retangular prateada.',
  energia: 'O conector do cabo de força vai na entrada de energia, na traseira do projetor.',
  tomada: 'O plugue do cabo de força vai na tomada da parede.',
};

export interface SetupState {
  /** O que já saiu da caixa e está na mesa. */
  placed: ItemId[];
  /** Onde cada ponta está ligada. */
  plugs: Partial<Record<PlugId, PortId>>;
  /** Apertou o botão: o notebook e o projetor ligaram. */
  on: boolean;
  /** O sistema terminou de instalar o driver da webcam. */
  driver: boolean;
  /** Posição do controle de foco (0 a 100) e onde a imagem fica nítida. */
  focus: number;
  focusTarget: number;
  /** Abriu o aplicativo da câmera e a imagem apareceu. */
  camera: boolean;
}

/** O foco começa longe do ponto certo (que muda a cada partida). */
export function newSetupState(random = Math.random): SetupState {
  const focusTarget = 25 + Math.round(random() * 50);
  return { placed: [], plugs: {}, on: false, driver: false, focus: focusTarget > 50 ? 0 : 100, focusTarget, camera: false };
}

/** Quanto o controle pode errar e a imagem ainda ficar nítida. */
export const FOCUS_TOLERANCE = 4;
export const focusOk = (s: SetupState) => Math.abs(s.focus - s.focusTarget) <= FOCUS_TOLERANCE;
/** Embaçado da imagem na parede, em pixels (0 = nítida). */
export const focusBlur = (s: SetupState) => (focusOk(s) ? 0 : Math.min(8, 1 + Math.abs(s.focus - s.focusTarget) / 8));

export const inBox = (s: SetupState) => ITEMS.filter((i) => !s.placed.includes(i.id));
export const plugVisible = (s: SetupState, plug: PlugId) => s.placed.includes(PLUGS[plug].item);
export const portVisible = (s: SetupState, port: PortId) => PORTS[port].on !== 'projetor' || s.placed.includes('projetor');
const portUsed = (s: SetupState, port: PortId) => Object.values(s.plugs).includes(port);

export type Attempt = { ok: true; state: SetupState } | { ok: false; reason: string };

/** Soltou uma coisa da caixa em `target`. O projetor e a webcam têm lugar certo; os cabos vão em qualquer ponto da mesa. */
export function tryPlace(s: SetupState, item: ItemId, target: DropTarget): Attempt {
  if (s.placed.includes(item)) return { ok: false, reason: '' };
  const fits = item === 'projetor' || item === 'webcam' ? target === item : target !== null;
  if (!fits) return { ok: false, reason: PLACE_HINT[item] };
  return { ok: true, state: { ...s, placed: [...s.placed, item] } };
}

/** Levou a ponta `plug` até a entrada `port`: encaixa se for o mesmo formato e a entrada estiver livre. */
export function tryPlug(s: SetupState, plug: PlugId, port: PortId): Attempt {
  if (!plugVisible(s, plug) || !portVisible(s, port) || s.plugs[plug]) return { ok: false, reason: '' };
  if (portUsed(s, port)) return { ok: false, reason: 'Essa entrada já tem um cabo ligado.' };
  const P = PLUGS[plug];
  const Q = PORTS[port];
  if (P.kind !== Q.kind)
    return { ok: false, reason: `Não encaixa: ${P.what} não serve n${Q.what}. ${PLUG_HINT[P.kind as Exclude<PlugKind, 'hdmi'>]}` };
  return { ok: true, state: { ...s, plugs: { ...s.plugs, [plug]: port } } };
}

/** O que falta para ligar (vazio = liga). */
export function missingForPower(s: SetupState): string[] {
  const out = inBox(s).map((i) => `tirar ${i.the} da caixa`);
  if (s.placed.includes('vga')) {
    if (!portUsed(s, 'nb-vga')) out.push('ligar o cabo VGA no notebook');
    if (s.placed.includes('projetor') && !portUsed(s, 'pj-vga')) out.push('ligar o cabo VGA no projetor');
  }
  if (s.placed.includes('forca')) {
    if (s.placed.includes('projetor') && !portUsed(s, 'pj-power')) out.push('ligar o cabo de força no projetor');
    if (!portUsed(s, 'tomada')) out.push('ligar o cabo de força na tomada');
  }
  if (s.placed.includes('webcam') && !portUsed(s, 'nb-usb')) out.push('ligar o cabo USB da webcam no notebook');
  return out;
}

/** Apertou o botão de ligar (o notebook e o projetor ligam juntos). */
export function tryPowerOn(s: SetupState): Attempt {
  if (s.on) return { ok: false, reason: '' };
  const missing = missingForPower(s);
  if (missing.length) {
    const list = missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(', ')} e ${missing[missing.length - 1]}`;
    return { ok: false, reason: `Ainda não dá para ligar. Falta ${list}.` };
  }
  return { ok: true, state: { ...s, on: true } };
}

/** Tudo pronto para a vídeo chamada: ligado, driver instalado, foco certo e a câmera testada. */
export const isReady = (s: SetupState) => s.on && s.driver && s.camera && focusOk(s);
