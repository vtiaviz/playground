// Fase 2, missão 1: levantamento dos computadores da empresa.
// O ESTAGIÁRIO acha cada equipamento, marca um traço na prancheta no tipo dele e cola o adesivo do tipo.
// No fim, o encarregado da TI confere. Este arquivo não depende de React nem do Phaser (testado com vitest).
import type { RoomId } from '../game/map';

export type ComputerType = 'desktop' | 'notebook' | 'servidor' | 'mainframe' | 'tablet' | 'smartphone';

export interface ComputerTypeInfo {
  id: ComputerType;
  /** Nome na prancheta e no adesivo. */
  name: string;
  plural: string;
  /** Cor do adesivo (a mesma do adesivo no mapa, gerado pelo gerar-arte.py). */
  color: string;
  /** O que é (o encarregado usa para explicar um erro). */
  what: string;
}

export const COMPUTER_TYPES: ComputerTypeInfo[] = [
  {
    id: 'desktop',
    name: 'Desktop',
    plural: 'desktops',
    color: '#2f7bd9',
    what: 'desktop é o computador de mesa: fica sempre no mesmo lugar, ligado na tomada, com monitor, teclado e mouse (às vezes o gabinete fica escondido atrás da tela, no tudo-em-um)',
  },
  {
    id: 'notebook',
    name: 'Notebook',
    plural: 'notebooks',
    color: '#22a35a',
    what: 'notebook é o computador portátil: tela, teclado e touchpad numa peça só, que fecha e funciona na bateria',
  },
  {
    id: 'servidor',
    name: 'Servidor',
    plural: 'servidores',
    color: '#8b5cf6',
    what: 'servidor fica ligado o tempo todo, guardado no rack da Sala de TI, sem monitor nem teclado, e "serve" arquivos, e-mails e sites para os outros computadores pela rede',
  },
  {
    id: 'mainframe',
    name: 'Mainframe',
    plural: 'mainframes',
    color: '#e8590c',
    what: 'mainframe é um computador gigante, do tamanho de armários, que processa milhões de operações para muita gente ao mesmo tempo',
  },
  {
    id: 'tablet',
    name: 'Tablet',
    plural: 'tablets',
    color: '#eab308',
    what: 'tablet é uma tela de toque grande, fina e sem teclado, com bateria',
  },
  {
    id: 'smartphone',
    name: 'Smartphone',
    plural: 'smartphones',
    color: '#ec4899',
    what: 'smartphone é o celular: um computador de bolso que também faz ligações',
  },
];

export const TYPE_INFO = Object.fromEntries(COMPUTER_TYPES.map((t) => [t.id, t])) as Record<ComputerType, ComputerTypeInfo>;

export type DeviceImage =
  | 'desktop-torre'
  | 'desktop-tudo-em-um'
  | 'desktop-montado'
  | 'notebook-claro'
  | 'notebook-escuro'
  | 'servidor'
  | 'mainframe'
  | 'tablet'
  | 'smartphone';

export interface SurveyDevice {
  id: string;
  type: ComputerType;
  room: RoomId;
  /** Nome curto: "Computador da Ana", "Aparelho na Copa"… (sem dizer o tipo). */
  name: string;
  /** Onde está, para o encarregado: "na mesa da Ana". */
  where: string;
  /** Rótulo do móvel no mapa (`map.deviceSpot`). */
  host: string;
  /** Equipamento pequeno desenhado em cima do móvel (sem ele, o móvel é o próprio computador). */
  gadget?: string;
  /** Qual dos móveis com o mesmo rótulo (os três racks de servidor). */
  nth?: number;
  image: DeviceImage;
  /** Resumo que aparece no alto do modal: descreve o equipamento sem dizer o tipo. */
  summary: string;
}

const deskSummary = (who: string, extra: string) =>
  `${who}. Monitor, teclado e mouse ligados por cabos a um gabinete separado, ao lado da tela. ${extra} Não tem bateria: só funciona ligado na tomada e não sai da mesa.`;

const aioSummary = (who: string) =>
  `${who}. Parece só um monitor, mas o computador inteiro está escondido atrás da tela (é um modelo "tudo-em-um"). Teclado e mouse separados, sem bateria: fica sempre na mesa, ligado na tomada.`;

const rackSummary = (job: string) =>
  `Gaveta de metal num armário (rack) da Sala de TI, ligada 24 horas por dia. Não tem monitor, teclado nem mouse: ${job}`;

export const SURVEY_DEVICES: SurveyDevice[] = [
  // Área de Trabalho
  { id: 'estacao-1', type: 'desktop', room: 'trabalho', name: 'Computador da Ana', where: 'na mesa da Ana', host: 'Estação 1', image: 'desktop-torre', summary: deskSummary('Computador que a Ana usa para fazer as planilhas', 'O gabinete tem leitor de DVD e várias entradas USB.') },
  { id: 'estacao-2', type: 'desktop', room: 'trabalho', name: 'Computador do Bruno', where: 'na mesa do Bruno', host: 'Estação 2', image: 'desktop-tudo-em-um', summary: aioSummary('Computador do Bruno') },
  { id: 'estacao-3', type: 'desktop', room: 'trabalho', name: 'Computador da Carla', where: 'na mesa da Carla', host: 'Estação 3', image: 'desktop-torre', summary: deskSummary('Computador da Carla, que cuida das compras', 'Dá para trocar peças do gabinete, como memória e disco.') },
  { id: 'estacao-4', type: 'desktop', room: 'trabalho', name: 'Computador do Diego', where: 'na mesa do Diego', host: 'Estação 4', image: 'desktop-torre', summary: deskSummary('Computador do Diego, que faz os desenhos e vídeos da empresa', 'O gabinete é grande e tem placa de vídeo potente.') },
  { id: 'estacao-5', type: 'desktop', room: 'trabalho', name: 'Computador da Elisa', where: 'na mesa da Elisa', host: 'Estação 5', image: 'desktop-tudo-em-um', summary: aioSummary('Computador da Elisa') },
  { id: 'estacao-6', type: 'desktop', room: 'trabalho', name: 'Computador do Fábio', where: 'na mesa do Fábio', host: 'Estação 6', image: 'desktop-torre', summary: deskSummary('Computador do Fábio, que atende os clientes por e-mail', 'Tem fone com microfone ligado no gabinete.') },
  // Diretoria e Recepção
  { id: 'diretoria', type: 'desktop', room: 'diretoria', name: 'Computador do CEO', where: 'na mesa do CEO', host: 'Mesa do diretor', image: 'desktop-tudo-em-um', summary: aioSummary('Computador do CEO, onde ele faz as palavras-cruzadas (e trabalha, às vezes)') },
  { id: 'recepcao', type: 'desktop', room: 'recepcao', name: 'Computador da recepção', where: 'no balcão da Recepção', host: 'Balcão da recepção', image: 'desktop-torre', summary: deskSummary('Computador da recepção, onde ficam a agenda e o cadastro dos visitantes', 'Fica ligado o dia inteiro no balcão.') },
  // RH e Financeiro
  { id: 'rh-mesa', type: 'desktop', room: 'rh', name: 'Computador novo do RH', where: 'na mesa nova do RH', host: 'Mesa nova 1', image: 'desktop-montado', summary: 'O computador que você montou ontem no RH! Gabinete em cima da mesa, monitor, webcam, caixas de som, teclado e mouse, tudo ligado por cabos. Sem bateria: só funciona na tomada.' },
  { id: 'fin-mesa', type: 'desktop', room: 'financeiro', name: 'Computador novo do Financeiro', where: 'na mesa nova do Financeiro', host: 'Mesa nova 2', image: 'desktop-montado', summary: 'O outro computador que você montou ontem, o do Financeiro (aquele do cabo HDMI). Gabinete, monitor e periféricos separados, ligados na tomada.' },
  { id: 'rh-portatil', type: 'notebook', room: 'rh', name: 'Computador da Rita', where: 'na mesinha do RH', host: 'Mesa do RH', gadget: 'notebook', image: 'notebook-claro', summary: 'Computador da Rita. Tela, teclado e touchpad numa peça só, que fecha como um livro. Tem bateria: ela leva para as entrevistas de emprego na Sala de Reuniões.' },
  { id: 'fin-portatil', type: 'notebook', room: 'financeiro', name: 'Computador da mesinha do Financeiro', where: 'na mesinha do Financeiro', host: 'Mesa do Financeiro', gadget: 'notebook', image: 'notebook-escuro', summary: 'Computador do gerente do Financeiro. Fino e leve, com tela e teclado juntos e bateria que dura o dia todo. Ele leva para casa toda noite numa mochila.' },
  // Sala de Reuniões
  { id: 'reuniao-1', type: 'notebook', room: 'reunioes', name: 'Computador na mesa de reunião', where: 'na mesa da Sala de Reuniões (o prateado)', host: 'Mesa de reunião', gadget: 'notebook-1', image: 'notebook-claro', summary: 'Computador que fica na Sala de Reuniões para mostrar apresentações na TV. Tela, teclado e touchpad juntos, abre e fecha, funciona na bateria.' },
  { id: 'reuniao-2', type: 'notebook', room: 'reunioes', name: 'Outro computador na mesa de reunião', where: 'na mesa da Sala de Reuniões (o preto)', host: 'Mesa de reunião', gadget: 'notebook-2', image: 'notebook-escuro', summary: 'Um computador de alguém da equipe, esquecido aberto na mesa depois da reunião. Tela e teclado numa peça só, com bateria e Wi-Fi.' },
  { id: 'reuniao-celular', type: 'smartphone', room: 'reunioes', name: 'Aparelho esquecido na reunião', where: 'na mesa da Sala de Reuniões', host: 'Mesa de reunião', gadget: 'celular', image: 'smartphone', summary: 'Aparelho pequeno que cabe no bolso, esquecido na mesa de reunião. Tela de toque, câmera, internet, aplicativos… e faz ligações. Está tocando sem parar!' },
  // Impressão e Almoxarifado
  { id: 'impressao-celular', type: 'smartphone', room: 'impressao', name: 'Aparelho em cima da copiadora', where: 'em cima da copiadora', host: 'Copiadora', gadget: 'celular', image: 'smartphone', summary: 'Alguém tirou cópias e esqueceu este aparelho em cima da copiadora. Cabe na mão, tem tela de toque, câmera, aplicativos e um chip de operadora para fazer ligações.' },
  // Copa
  { id: 'copa-tablet', type: 'tablet', room: 'copa', name: 'Aparelho na mesinha da Copa', where: 'na mesinha da Copa', host: 'Mesinha', gadget: 'tablet', image: 'tablet', summary: 'É o aparelho da prova da Elisa, de ontem! Tela de toque de 10 polegadas, fino, sem teclado: você usa com o dedo. Tem bateria e Wi-Fi, mas não faz ligações.' },
  { id: 'copa-celular', type: 'smartphone', room: 'copa', name: 'Aparelho carregando na Copa', where: 'carregando na bancada da Copa', host: 'Bancada', gadget: 'celular', image: 'smartphone', summary: 'Aparelho de bolso carregando na tomada da bancada. Tela de toque, câmera, aplicativos de mensagem e ligações. É da Rita, que esqueceu aqui na hora do café.' },
  // Arquivo
  { id: 'arquivo-tablet', type: 'tablet', room: 'arquivo', name: 'Aparelho em cima do arquivo', where: 'no suporte em cima do arquivo', host: 'Arquivo com tablet', gadget: 'tablet', image: 'tablet', summary: 'Tela de toque grande, fina, sem teclado, num suporte em cima do arquivo. Serve para procurar os documentos digitalizados sem abrir as gavetas. Tem bateria e Wi-Fi.' },
  // Sala de TI
  { id: 'ti-mesa', type: 'desktop', room: 'ti', name: 'Computador do Marcos', where: 'na mesa da Sala de TI', host: 'Mesa da TI', image: 'desktop-torre', summary: deskSummary('Computador do Marcos, o encarregado da TI', 'É por ele que o Marcos cuida dos outros computadores da empresa.') },
  { id: 'servidor-1', type: 'servidor', room: 'ti', name: 'Rack 1 da Sala de TI', where: 'no primeiro rack da Sala de TI', host: 'Servidor', nth: 0, image: 'servidor', summary: rackSummary('guarda os arquivos da empresa. Quando alguém abre uma pasta da rede no computador da mesa, os arquivos vêm daqui.') },
  { id: 'servidor-2', type: 'servidor', room: 'ti', name: 'Rack 2 da Sala de TI', where: 'no segundo rack da Sala de TI', host: 'Servidor', nth: 1, image: 'servidor', summary: rackSummary('cuida dos e-mails e do site da empresa. Ele "serve" os outros computadores pela rede e pela internet.') },
  { id: 'servidor-3', type: 'servidor', room: 'ti', name: 'Rack 3 da Sala de TI', where: 'no terceiro rack da Sala de TI', host: 'Servidor', nth: 2, image: 'servidor', summary: rackSummary('faz a cópia de segurança (backup) de tudo toda noite, para nada se perder.') },
  { id: 'mainframe', type: 'mainframe', room: 'ti', name: 'Os armários grandes da Sala de TI', where: 'nos armários grandes da Sala de TI', host: 'Mainframe', image: 'mainframe', summary: 'Dois gabinetes do tamanho de geladeiras, com faixas de luz e um painel de status. Processa milhões de operações por segundo, para centenas de pessoas ao mesmo tempo, e quase nunca é desligado. Cuida dos pagamentos e da folha de salários de todas as filiais.' },
];

/** O que o ESTAGIÁRIO fez em cada equipamento: o traço na prancheta e o adesivo colado. */
export interface DeviceTag {
  mark: ComputerType | null;
  sticker: ComputerType | null;
  /** Onde o adesivo foi colado na imagem do modal (0 a 1). */
  at?: { x: number; y: number };
}

export type Survey = Record<string, DeviceTag>;

export const EMPTY_TAG: DeviceTag = { mark: null, sticker: null };

export const tagOf = (s: Survey, id: string): DeviceTag => s[id] ?? EMPTY_TAG;

/** Equipamento com traço E adesivo (pronto, mesmo que esteja errado). */
export const isTagged = (t: DeviceTag) => t.mark !== null && t.sticker !== null;

/** Traços da prancheta por tipo. */
export function tally(s: Survey): Record<ComputerType, number> {
  const out = Object.fromEntries(COMPUTER_TYPES.map((t) => [t.id, 0])) as Record<ComputerType, number>;
  for (const tag of Object.values(s)) if (tag.mark) out[tag.mark]++;
  return out;
}

/** Quantos equipamentos de cada tipo a empresa tem de verdade. */
export function realCount(): Record<ComputerType, number> {
  const out = Object.fromEntries(COMPUTER_TYPES.map((t) => [t.id, 0])) as Record<ComputerType, number>;
  for (const d of SURVEY_DEVICES) out[d.type]++;
  return out;
}

export const taggedCount = (s: Survey) => SURVEY_DEVICES.filter((d) => isTagged(tagOf(s, d.id))).length;

export interface SurveyProblem {
  device: SurveyDevice;
  /** missing: não foi achado; noMark/noSticker: faltou um dos dois; wrongMark/wrongSticker: tipo errado. */
  kind: 'missing' | 'noMark' | 'noSticker' | 'wrongMark' | 'wrongSticker';
  /** O que foi marcado ou colado (nos erros de tipo). */
  got?: ComputerType;
}

/** Conferência do encarregado da TI: cada equipamento precisa do traço no tipo certo e do adesivo certo. */
export function checkSurvey(s: Survey): SurveyProblem[] {
  const out: SurveyProblem[] = [];
  for (const d of SURVEY_DEVICES) {
    const t = tagOf(s, d.id);
    if (!t.mark && !t.sticker) {
      out.push({ device: d, kind: 'missing' });
      continue;
    }
    if (!t.mark) out.push({ device: d, kind: 'noMark' });
    else if (t.mark !== d.type) out.push({ device: d, kind: 'wrongMark', got: t.mark });
    if (!t.sticker) out.push({ device: d, kind: 'noSticker' });
    else if (t.sticker !== d.type) out.push({ device: d, kind: 'wrongSticker', got: t.sticker });
  }
  return out;
}

/** "na Copa", "no RH"… (para o encarregado dizer onde procurar). */
const ROOM_IN: Record<RoomId, string> = {
  diretoria: 'na Diretoria',
  reunioes: 'na Sala de Reuniões',
  rh: 'no RH',
  financeiro: 'no Financeiro',
  impressao: 'na Impressão e Almoxarifado',
  copa: 'na Copa',
  ti: 'na Sala de TI',
  arquivo: 'no Arquivo',
  banheiro: 'no Banheiro',
  trabalho: 'na Área de Trabalho',
  recepcao: 'na Recepção',
  entrada: 'na entrada',
};

/** "a", "a e b", "a, b e c". */
const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`);

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const n = (k: number, t: ComputerTypeInfo) => `${k} ${k === 1 ? t.name.toLowerCase() : t.plural}`;

/** O que o encarregado fala: os não achados agrupados por tipo, depois uma fala por equipamento com erro. */
export function explainProblems(problems: SurveyProblem[]): string[] {
  const lines: string[] = [];
  const missing = problems.filter((p) => p.kind === 'missing');
  for (const t of COMPUTER_TYPES) {
    const ds = missing.filter((p) => p.device.type === t.id).map((p) => p.device);
    if (!ds.length) continue;
    const rooms = [...new Set(ds.map((d) => ROOM_IN[d.room]))];
    lines.push(`Faltou achar ${n(ds.length, t)}. Dica: procure ${list(rooms)}.`);
  }
  for (const d of SURVEY_DEVICES) {
    const mine = problems.filter((p) => p.device === d && p.kind !== 'missing');
    if (!mine.length) continue;
    const t = TYPE_INFO[d.type];
    const kinds = new Set(mine.map((p) => p.kind));
    const parts: string[] = [];
    const wrongMark = mine.find((p) => p.kind === 'wrongMark');
    const wrongSticker = mine.find((p) => p.kind === 'wrongSticker');
    if (wrongMark) parts.push(`você marcou ${TYPE_INFO[wrongMark.got!].name} na prancheta`);
    if (wrongSticker) parts.push(`colou o adesivo de ${TYPE_INFO[wrongSticker.got!].name}`);
    if (kinds.has('noMark')) parts.push('esqueceu de marcar o traço na prancheta');
    if (kinds.has('noSticker')) parts.push('ficou sem adesivo');
    const wrongType = wrongMark || wrongSticker;
    const text = `${capitalize(d.where)}: ${list(parts)}.`;
    lines.push(wrongType ? `${text} É ${t.name}: ${t.what}.` : text);
  }
  return lines;
}

/**
 * Depois de uma conferência com erro: tira o adesivo e apaga o traço de cada equipamento com problema,
 * para o ESTAGIÁRIO refazer só esses (os não achados continuam por achar).
 */
export function clearWrong(s: Survey, problems: SurveyProblem[]): Survey {
  const next: Survey = { ...s };
  for (const p of problems) if (p.kind !== 'missing') delete next[p.device.id];
  return next;
}

/** "|||| |" — traços agrupados de 5 em 5 (o quinto corta os quatro, desenhado no modal). */
export function tallyGroups(k: number): number[] {
  const out: number[] = [];
  for (let left = k; left > 0; left -= 5) out.push(Math.min(5, left));
  return out;
}
