// Mapa do escritório (fase de teste).
// A grade de tiles e a posição dos móveis vêm de office-map.json, gerado junto com a arte por
// scripts/gerar-arte.py. Este arquivo não importa nada do Phaser: os testes conferem o mapa sem navegador.
//
// Colisão "pelos pés": o corpo do ESTAGIÁRIO é só um retângulo baixo na altura dos sapatos, e cada móvel
// colide só pela base. Assim ele passa por trás da parte alta dos móveis (visão top-down com profundidade).
import data from './office-map.json';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Solid extends Rect {
  label: string;
}

export type FurnitureLayer = 'object' | 'wall' | 'floor';

export interface Furniture {
  /** Nome do quadro no atlas moveis.png. */
  type: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  layer: FurnitureLayer;
  /** Base que colide, em px do mapa (null = sem colisão). */
  foot: Rect | null;
}

export type RoomId =
  | 'diretoria'
  | 'reunioes'
  | 'rh'
  | 'financeiro'
  | 'impressao'
  | 'copa'
  | 'ti'
  | 'arquivo'
  | 'banheiro'
  | 'trabalho'
  | 'recepcao'
  | 'entrada';

export interface Room extends Rect {
  id: RoomId;
  name: string;
  /** Um ponto livre dentro da sala (os testes conferem que dá para chegar nele andando). */
  anchor: { x: number; y: number };
}

export const TILE = data.tileSize;
export const GRID = { cols: data.width, rows: data.height };
export const MAP_SIZE = { width: data.width * TILE, height: data.height * TILE };
export const TILE_DATA: number[][] = data.tiles;
export const SOLID_TILES: number[] = data.solidTiles;

const TILE_NAMES: string[] = data.tileNames;
export const tileIndex = (name: string) => {
  const i = TILE_NAMES.indexOf(name);
  if (i < 0) throw new Error(`Tile desconhecido: ${name}`);
  return i;
};

/** Onde o ESTAGIÁRIO começa (posição dos pés): na calçada, em frente à porta principal. */
export const SPAWN = { x: 23.5 * TILE, y: 32.4 * TILE };

/** Porta de vidro principal: os tiles do meio abrem quando o personagem chega perto. */
export const MAIN_DOOR = { row: 29, cols: [22, 23, 24], center: { x: 23.5 * TILE, y: 29.5 * TILE } };

/** Corpo de colisão do personagem: largura × altura, com a base nos pés. */
export const PLAYER_BODY = { w: 20, h: 10 };

type TypeInfo = { w: number; h: number; layer: string; foot: number[] | null };
const TYPES = data.types as Record<string, TypeInfo>;

export const FURNITURE: Furniture[] = data.items.map((it) => {
  const t = TYPES[it.type];
  if (!t) throw new Error(`Móvel sem tipo no atlas: ${it.type}`);
  return {
    type: it.type,
    label: it.label,
    x: it.x,
    y: it.y,
    w: t.w,
    h: t.h,
    layer: t.layer as FurnitureLayer,
    foot: t.foot ? { x: it.x + t.foot[0], y: it.y + t.foot[1], w: t.foot[2], h: t.foot[3] } : null,
  };
});

/** Tiles sólidos (paredes, porta de vidro, rua) agrupados em retângulos por linha. */
function wallRects(): Solid[] {
  const out: Solid[] = [];
  TILE_DATA.forEach((row, ty) => {
    let start = -1;
    for (let tx = 0; tx <= row.length; tx++) {
      const solid = tx < row.length && SOLID_TILES.includes(row[tx]);
      if (solid && start < 0) start = tx;
      if (!solid && start >= 0) {
        out.push({ label: 'Parede', x: start * TILE, y: ty * TILE, w: (tx - start) * TILE, h: TILE });
        start = -1;
      }
    }
  });
  return out;
}

export const WALLS: Solid[] = wallRects();
const DOOR_RECT: Rect = { x: MAIN_DOOR.cols[0] * TILE, y: MAIN_DOOR.row * TILE, w: MAIN_DOOR.cols.length * TILE, h: TILE };
export const OBJECTS: Solid[] = FURNITURE.filter((f) => f.foot).map((f) => ({ label: f.label, ...f.foot! }));
export const SOLIDS: Solid[] = [...WALLS, ...OBJECTS];

const t = (n: number) => n * TILE;

// A ordem importa: a primeira sala que contém os pés do personagem é a sala atual.
export const ROOMS: Room[] = [
  { id: 'diretoria', name: 'Diretoria', x: t(1), y: t(1), w: t(13), h: t(9), anchor: { x: t(3), y: t(8) } },
  { id: 'reunioes', name: 'Sala de Reuniões', x: t(15), y: t(1), w: t(16), h: t(9), anchor: { x: t(16), y: t(8.5) } },
  { id: 'rh', name: 'RH', x: t(32), y: t(1), w: t(7), h: t(9), anchor: { x: t(34), y: t(8.6) } },
  { id: 'financeiro', name: 'Financeiro', x: t(40), y: t(1), w: t(7), h: t(9), anchor: { x: t(42), y: t(8.6) } },
  { id: 'impressao', name: 'Impressão e Almoxarifado', x: t(1), y: t(11), w: t(11), h: t(9), anchor: { x: t(8), y: t(17) } },
  { id: 'copa', name: 'Copa', x: t(35), y: t(11), w: t(12), h: t(9), anchor: { x: t(37.5), y: t(17.5) } },
  { id: 'ti', name: 'Sala de TI', x: t(1), y: t(21), w: t(11), h: t(8), anchor: { x: t(4), y: t(28) } },
  { id: 'arquivo', name: 'Arquivo', x: t(35), y: t(21), w: t(6), h: t(8), anchor: { x: t(38), y: t(27) } },
  { id: 'banheiro', name: 'Banheiro', x: t(41), y: t(21), w: t(6), h: t(8), anchor: { x: t(44), y: t(27) } },
  { id: 'trabalho', name: 'Área de Trabalho', x: t(12), y: t(11), w: t(23), h: t(12), anchor: { x: t(19.5), y: t(17) } },
  { id: 'recepcao', name: 'Recepção', x: t(12), y: t(23), w: t(23), h: t(6), anchor: { x: t(17), y: t(27) } },
  { id: 'entrada', name: 'Entrada da empresa', x: 0, y: t(29.6), w: t(48), h: t(3.4), anchor: { x: t(30), y: t(32) } },
];

export const CORRIDOR_NAME = 'Corredor';

const inside = (r: Rect, x: number, y: number) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

/** Sala onde está o ponto (normalmente os pés do personagem); `null` = corredor. */
export function roomAt(x: number, y: number): Room | null {
  return ROOMS.find((r) => inside(r, x, y)) ?? null;
}

/** Corpo de colisão do personagem com os pés em (x, y). */
export function playerBodyAt(x: number, y: number): Rect {
  return { x: x - PLAYER_BODY.w / 2, y: y - PLAYER_BODY.h, w: PLAYER_BODY.w, h: PLAYER_BODY.h };
}

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** O personagem cabe com os pés em (x, y) sem encostar em parede ou móvel? `doorOpen`: porta principal aberta. */
export function isFree(x: number, y: number, doorOpen = false): boolean {
  const body = playerBodyAt(x, y);
  if (body.x < 0 || body.y < 0 || body.x + body.w > MAP_SIZE.width || body.y + body.h > MAP_SIZE.height) return false;
  return !SOLIDS.some((r) => overlaps(body, r) && !(doorOpen && insideRect(r, DOOR_RECT) && overlapsDoorOnly(body, r)));
}

const insideRect = (outer: Rect, inner: Rect) =>
  inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;

// A parede da linha da porta é um retângulo só (inclui a porta): com a porta aberta, só a parte da porta libera.
function overlapsDoorOnly(body: Rect, wall: Rect) {
  const left: Rect = { ...wall, w: DOOR_RECT.x - wall.x };
  const right: Rect = { ...wall, x: DOOR_RECT.x + DOOR_RECT.w, w: wall.x + wall.w - (DOOR_RECT.x + DOOR_RECT.w) };
  return !(left.w > 0 && overlaps(body, left)) && !(right.w > 0 && overlaps(body, right));
}

/** Área (pés do personagem) em que o CEO puxa conversa: em volta da mesa dele. */
export const CEO_TALK_ZONE: Rect = { x: t(3), y: t(3.5), w: t(7), h: t(5.5) };

// ---------------------------------------------------------------- missão 2: estações de trabalho e caminhos

export interface Workstation {
  /** 0 a 5, na ordem "Estação 1" … "Estação 6". */
  index: number;
  desk: Furniture;
  colleague: Furniture;
  /** Visual do colega (linha do colegas.png). */
  look: number;
  /** Onde o colega fica (pés) quando está sentado. */
  seat: { x: number; y: number };
  /** Área (pés do ESTAGIÁRIO) na frente da mesa que abre o computador. */
  zone: Rect;
}

export const WORKSTATIONS: Workstation[] = Array.from({ length: 6 }, (_, i) => {
  const desk = FURNITURE.find((f) => f.label === `Estação ${i + 1}`);
  const colleague = FURNITURE.find((f) => f.label === `Colega ${i + 1}`);
  if (!desk || !colleague || !desk.foot) throw new Error(`Estação ${i + 1} incompleta no mapa`);
  return {
    index: i,
    desk,
    colleague,
    look: Number(colleague.type.replace('colega-', '')),
    seat: { x: colleague.x + colleague.w / 2, y: desk.foot.y - 2 },
    zone: { x: desk.foot.x - 8, y: desk.foot.y + desk.foot.h, w: desk.foot.w + 16, h: 40 },
  };
});

/** Onde os colegas ficam em pé durante a reunião (em volta da mesa da sala de reuniões). */
export const MEETING_SPOTS = [560, 615, 670, 725, 800, 855].map((x, i) => ({ x, y: i < 4 ? t(7.4) : t(5.6) }));

/** Na frente da mesa do CEO: aonde o colega vai reclamar. */
export const CEO_FRONT = { x: t(6.6), y: t(8.3) };

const PATH_STEP = 8;
const IGNORE_IN_PATHS = /^(Colega|CEO|Recepcionista)/;
const PATH_SOLIDS: Solid[] = [...WALLS, ...OBJECTS.filter((o) => !IGNORE_IN_PATHS.test(o.label))];

function freeForWalker(x: number, y: number) {
  const body = playerBodyAt(x, y);
  if (body.x < 0 || body.y < 0 || body.x + body.w > MAP_SIZE.width || body.y + body.h > MAP_SIZE.height) return false;
  return !PATH_SOLIDS.some((r) => overlaps(body, r));
}

/**
 * Caminho (lista de pontos, em px) para um colega andar de `from` até `to` sem atravessar paredes nem
 * móveis. Busca em largura numa grade de 8 px; devolve só os pontos onde o caminho muda de direção.
 */
export function findPath(from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number }[] {
  const cols = Math.ceil(MAP_SIZE.width / PATH_STEP);
  const rows = Math.ceil(MAP_SIZE.height / PATH_STEP);
  const cell = (p: { x: number; y: number }) => ({ c: Math.round(p.x / PATH_STEP), r: Math.round(p.y / PATH_STEP) });
  const free = (c: number, r: number) => c >= 0 && r >= 0 && c < cols && r < rows && freeForWalker(c * PATH_STEP, r * PATH_STEP);

  // ponto livre mais perto (a cadeira do colega, por exemplo, fica colada na mesa)
  const nearestFree = (p: { x: number; y: number }) => {
    const s = cell(p);
    for (let d = 0; d < 12; d++) {
      for (let dr = -d; dr <= d; dr++) {
        for (let dc = -d; dc <= d; dc++) {
          if (Math.max(Math.abs(dr), Math.abs(dc)) === d && free(s.c + dc, s.r + dr)) return { c: s.c + dc, r: s.r + dr };
        }
      }
    }
    return s;
  };

  const start = nearestFree(from);
  const goal = nearestFree(to);
  const prev = new Int32Array(cols * rows).fill(-1);
  const startI = start.r * cols + start.c;
  const goalI = goal.r * cols + goal.c;
  prev[startI] = startI;
  const queue = [startI];
  for (let qi = 0; qi < queue.length && prev[goalI] < 0; qi++) {
    const cur = queue[qi];
    const c = cur % cols;
    const r = (cur - c) / cols;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc;
      const nr = r + dr;
      const ni = nr * cols + nc;
      if (!free(nc, nr) || prev[ni] >= 0) continue;
      prev[ni] = cur;
      queue.push(ni);
    }
  }
  if (prev[goalI] < 0) return [to];

  const cells: number[] = [];
  for (let i = goalI; i !== startI; i = prev[i]) cells.push(i);
  cells.push(startI);
  cells.reverse();

  const points = cells.map((i) => ({ x: (i % cols) * PATH_STEP, y: Math.floor(i / cols) * PATH_STEP }));
  // mantém só as curvas
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = out[out.length - 1];
    const b = points[i];
    const c = points[i + 1];
    const sameDir = (b.x - a.x === 0 && c.x - b.x === 0) || (b.y - a.y === 0 && c.y - b.y === 0);
    if (!sameDir) out.push(b);
  }
  out.push(points[points.length - 1]);
  return out;
}

// ---------------------------------------------------------------- missão 3: montar os computadores no RH

export interface RhStation {
  /** 0 ou 1 ("Caixa 1" / "Mesa nova 1" …). */
  index: number;
  /** Sala da mesa: a caixa 1 fica no RH e a caixa 2 no Financeiro. */
  room: RoomId;
  desk: Furniture;
  box: Furniture;
  /** Área (pés do ESTAGIÁRIO) na frente da caixa que abre a montagem. */
  zone: Rect;
  /** Onde a responsável do RH para para conferir a mesa. */
  spot: { x: number; y: number };
}

export const RH_STATIONS: RhStation[] = [0, 1].map((i) => {
  const desk = FURNITURE.find((f) => f.label === `Mesa nova ${i + 1}`);
  const box = FURNITURE.find((f) => f.label === `Caixa ${i + 1}`);
  if (!desk?.foot || !box?.foot) throw new Error(`Mesa nova/Caixa ${i + 1} faltando no mapa`);
  return {
    index: i,
    room: i === 0 ? 'rh' : 'financeiro',
    desk,
    box,
    zone: { x: box.foot.x - 8, y: box.foot.y + box.foot.h, w: box.foot.w + 16, h: 36 },
    spot: { x: desk.x + desk.w / 2, y: desk.foot.y + desk.foot.h + 14 },
  };
});

/** Na Copa: onde a responsável do RH fica tomando café. */
export const RH_HOME = { x: t(41.9), y: t(16) };
/** No RH, ao lado da caixa: onde ela espera o ESTAGIÁRIO. */
export const RH_WAIT = { x: t(36.4), y: t(7.6) };

// ---------------------------------------------------------------- missão 4: o quadro branco da sala de reuniões

const board = FURNITURE.find((f) => f.label === 'Quadro branco');
if (!board) throw new Error('Quadro branco faltando no mapa');
/** O quadro branco (pendurado na parede da Sala de Reuniões). */
export const BOARD: Furniture = board;
/** Na frente do quadro: onde o colega esbarra e fica esperando o ESTAGIÁRIO. */
export const BOARD_SPOT = { x: BOARD.x + BOARD.w / 2, y: t(3.7) };

// ---------------------------------------------------------------- missão 5: a prova no tablet, na Copa

/** Na Copa, ao lado da Rita: onde a colega para para conversar. */
export const COPA_CHAT = { x: t(43.5), y: t(16) };
/** Canto da Copa, perto da porta e longe da Rita: onde a colega chama o ESTAGIÁRIO discretamente. */
export const COPA_CORNER = { x: t(37), y: t(18.4) };

// ---------------------------------------------------------------- missão 6: fim do expediente

/** Uma mesa com computador: onde fica o monitor (para a luz da tela) e a área na frente que abre o computador. */
export interface DeskSpot {
  desk: Furniture;
  /** Topo do monitor, no meio da mesa. */
  monitor: { x: number; y: number };
  zone: Rect;
}

export function deskSpot(label: string): DeskSpot {
  const desk = FURNITURE.find((f) => f.label === label);
  if (!desk?.foot) throw new Error(`Mesa "${label}" faltando no mapa`);
  return {
    desk,
    monitor: { x: desk.x + desk.w / 2, y: desk.y + 2 },
    zone: { x: desk.foot.x - 8, y: desk.foot.y + desk.foot.h, w: desk.foot.w + 16, h: 36 },
  };
}

const alarm = FURNITURE.find((f) => f.label === 'Painel do alarme');
if (!alarm?.foot) throw new Error('Painel do alarme faltando no mapa');
/** Painel do alarme, num pedestal ao lado da porta principal (dentro da Recepção). */
export const ALARM_PANEL: Furniture = alarm;
/** Em volta do painel (pés do ESTAGIÁRIO): abre o teclado do alarme. */
export const ALARM_ZONE: Rect = {
  x: alarm.foot!.x - 22,
  y: alarm.foot!.y - 8,
  w: alarm.foot!.w + 44,
  h: MAIN_DOOR.row * TILE - (alarm.foot!.y - 8),
};

/** Dentro, na frente da porta principal, e do lado de fora, na calçada: o caminho de quem vai embora. */
export const EXIT_INSIDE = { x: MAIN_DOOR.center.x, y: t(28.4) };
export const EXIT_OUTSIDE = { x: MAIN_DOOR.center.x, y: t(31.6) };

const ceoChair = FURNITURE.find((f) => f.label === 'CEO');
if (!ceoChair) throw new Error('CEO faltando no mapa');
/** Onde o CEO fica sentado (pés), para ele levantar e ir embora. */
export const CEO_SEAT = { x: ceoChair.x + ceoChair.w / 2, y: ceoChair.y + ceoChair.h - 4 };

// ---------------------------------------------------------------- fase 2, missão 1: levantamento dos computadores

/** Equipamentos pequenos desenhados em cima de móveis: tipo do móvel → nome → ponto (px, relativo ao canto). */
const GADGETS = (data as { gadgets?: Record<string, Record<string, number[]>> }).gadgets ?? {};

/** Onde fica o computador nos móveis que são o próprio computador (meio do monitor, do rack…), em px. */
const DEVICE_ANCHOR: Record<string, [number, number]> = {
  'mesa-pc-0': [50, 10],
  'mesa-pc-1': [50, 10],
  'mesa-pc-2': [50, 10],
  'mesa-vazia': [50, 10],
  'mesa-diretor': [76, 10],
  balcao: [116, 8],
  servidor: [20, 14],
  mainframe: [42, 24],
};

/** Um equipamento no mapa: o móvel, o ponto do adesivo e a área (na frente) que abre o equipamento. */
export interface DeviceSpot {
  host: Furniture;
  point: { x: number; y: number };
  zone: Rect;
}

/**
 * `host`: rótulo do móvel. `gadget`: nome do equipamento pequeno desenhado em cima dele (ex.: "notebook-1" na mesa
 * de reunião); sem ele, o móvel é o próprio computador. `nth`: qual dos móveis com o mesmo rótulo (servidores).
 */
export function deviceSpot(host: string, gadget?: string, nth = 0): DeviceSpot {
  const f = FURNITURE.filter((x) => x.label === host)[nth];
  if (!f?.foot) throw new Error(`Móvel "${host}" faltando no mapa`);
  const rel = gadget ? GADGETS[f.type]?.[gadget] : DEVICE_ANCHOR[f.type];
  if (!rel) throw new Error(`Equipamento "${gadget ?? f.type}" não encontrado em "${host}"`);
  const point = { x: f.x + rel[0], y: f.y + rel[1] };
  const w = gadget ? 56 : Math.max(40, Math.min(f.foot.w + 4, 84));
  return { host: f, point, zone: { x: point.x - w / 2, y: f.foot.y + f.foot.h, w, h: 36 } };
}

/** Onde o encarregado da TI espera o ESTAGIÁRIO com a prancheta (em pé, no canto da Sala de TI). */
export const IT_WAIT = { x: t(9.7), y: t(27.6) };
/** Em volta dele: abre a pergunta "entregar a prancheta?". */
export const IT_ZONE: Rect = { x: IT_WAIT.x - 30, y: IT_WAIT.y - 40, w: 60, h: 64 };

const itChair = FURNITURE.find((f) => f.label === 'Colega da TI');
if (!itChair) throw new Error('Colega da TI faltando no mapa');
/** Onde o encarregado da TI fica sentado (pés). */
export const IT_SEAT = { x: itChair.x + itChair.w / 2, y: itChair.y + itChair.h - 4 };

// ---------------------------------------------------------------- fase 2, missão 2: caça-palavras no quadro branco

/** Onde os três colegas ficam em pé, olhando o quadro (dos lados, para deixar a frente livre). */
export const BOARD_CROWD = [
  { x: BOARD.x - 26, y: t(3.9) },
  { x: BOARD.x + BOARD.w + 26, y: t(3.9) },
  { x: BOARD.x - 40, y: t(5.6) },
];

/** Na frente do quadro (pés do ESTAGIÁRIO): abre o caça-palavras. */
export const BOARD_ZONE: Rect = { x: BOARD.x + 4, y: t(3.1), w: BOARD.w - 8, h: t(1.5) };

// ---------------------------------------------------------------- fase 2, missão 3: placas escondidas nos armários

/** Um móvel onde dá para procurar: a lupa fica em cima e a área na frente começa a busca. */
export interface SearchSpot {
  host: Furniture;
  /** Meio do topo do móvel (a lupa e a bagunça saem daqui). */
  top: { x: number; y: number };
  zone: Rect;
}

/** `host`: rótulo do móvel; `nth`: qual dos móveis com o mesmo rótulo (os arquivos são vários). */
export function searchSpot(host: string, nth = 0): SearchSpot {
  const f = FURNITURE.filter((x) => x.label === host)[nth];
  if (!f?.foot) throw new Error(`Móvel "${host}" (${nth}) faltando no mapa`);
  // estreita: os arquivos ficam lado a lado, a 3 px um do outro
  const w = f.foot.w + 4;
  const cx = f.x + f.w / 2;
  return { host: f, top: { x: cx, y: f.y }, zone: { x: cx - w / 2, y: f.foot.y + f.foot.h, w, h: 32 } };
}

/** Distância (pés do ESTAGIÁRIO até a placa) em que a placa é coletada. */
export const PICKUP_RADIUS = 22;

// para onde as placas voam, a partir dos pés do ESTAGIÁRIO: em volta, nunca para cima (é o móvel), primeiro
// para baixo e para os lados; mais perto ou mais longe quando tem parede
const LAND_ANGLES = [150, 30, 90, 120, 60, 180, 0, 165, 15, 105, 75, 135, 45];
const LAND_OFFSETS = [48, 60, 40, 72, 32].flatMap((r) =>
  LAND_ANGLES.map((a) => [Math.round(r * Math.cos((a * Math.PI) / 180)), Math.round(r * Math.sin((a * Math.PI) / 180))]),
);

/**
 * Onde `n` placas caem no chão, perto de quem procurou (`from`): em lugar livre, na mesma sala, longe o bastante
 * para o ESTAGIÁRIO ter que andar até elas e uma longe da outra (cada uma é coletada separado). Fora das áreas
 * `avoid` (as de busca dos outros móveis), para pegar a placa não começar outra busca.
 */
export function landingSpots(from: { x: number; y: number }, n: number, avoid: Rect[] = []): { x: number; y: number }[] {
  const room = roomAt(from.x, from.y)?.id;
  const out: { x: number; y: number }[] = [];
  for (const [dx, dy] of LAND_OFFSETS) {
    if (out.length === n) break;
    const p = { x: Math.round(from.x + dx), y: Math.round(from.y + dy) };
    if (!isFree(p.x, p.y) || roomAt(p.x, p.y)?.id !== room) continue;
    if (avoid.some((z) => p.x > z.x - 6 && p.x < z.x + z.w + 6 && p.y > z.y - 6 && p.y < z.y + z.h + 6)) continue;
    if (out.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 46)) continue;
    out.push(p);
  }
  return out;
}

// ---------------------------------------------------------------- fase 2, missão 4: o Marcos cochila jogando forca

const itDesk = FURNITURE.find((f) => f.label === 'Mesa da TI');
if (!itDesk) throw new Error('Mesa da TI faltando no mapa');
/** Onde o tablet do Marcos cai: no chão, do lado direito da mesa dele. */
export const IT_TABLET_FLOOR = { x: itDesk.x + itDesk.w + 14, y: itDesk.y + 44 };
/** Em volta do tablet caído (pés do ESTAGIÁRIO): abre a forca. */
export const IT_TABLET_ZONE: Rect = { x: IT_TABLET_FLOOR.x - 24, y: IT_TABLET_FLOOR.y - 18, w: 48, h: 40 };
/** Em cima da mesa do Marcos, ao lado do monitor: onde o ESTAGIÁRIO deixa o tablet. */
export const IT_TABLET_DESK = { x: itDesk.x + itDesk.w - 22, y: itDesk.y + 20 };
/** No corredor em cima da Sala de TI, saindo pela porta: para onde o ESTAGIÁRIO corre. */
export const IT_EXIT = { x: t(11), y: t(20.5) };

// ---------------------------------------------------------------- fase 3, missão 2: a água e as palavras-cruzadas da Rita

const cooler = FURNITURE.find((f) => f.label === 'Bebedouro');
if (!cooler?.foot) throw new Error('Bebedouro faltando no mapa');
/** Na frente do bebedouro da Copa: onde o ESTAGIÁRIO bebe água. */
export const WATER_SPOT = { x: cooler.x + cooler.w / 2, y: cooler.foot.y + cooler.foot.h + 16 };
/** Na Copa, perto da geladeira: onde a Rita fica esperando com o tablet se o ESTAGIÁRIO não ajudar agora. */
export const COPA_RITA_WAIT = COPA_CHAT;

/** Ponto livre colado no ESTAGIÁRIO, do lado mais perto de `from` (para alguém parar atrás dele). */
type Point = { x: number; y: number };

export function besidePlayer(player: Point, from: Point, gap = 30): Point {
  const sides = [
    { x: player.x - gap, y: player.y },
    { x: player.x + gap, y: player.y },
    { x: player.x, y: player.y - gap },
    { x: player.x, y: player.y + gap },
  ].filter((p) => isFree(p.x, p.y));
  sides.sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y));
  return sides[0] ?? player;
}

// ---------------------------------------------------------------- fase 3, missão 3: as 3 caixas dos computadores

/** Na Área de Trabalho, saindo da Copa: para onde o ESTAGIÁRIO foge depois da água. */
export const COPA_ESCAPE = { x: t(31), y: t(15.6) };

/** As 3 caixas na Sala de TI (canto de cima à esquerda do desenho de 48 x 40): estudante, gamer e escritório. */
export const PC_BOXES: { at: Point; foot: Rect; zone: Rect }[] = [
  { x: 44, y: 828 },
  { x: 92, y: 828 },
  { x: 286, y: 818 },
].map((at) => ({
  at,
  foot: { x: at.x + 4, y: at.y + 24, w: 40, h: 14 },
  zone: { x: at.x, y: at.y + 38, w: 48, h: 30 },
}));

// ---------------------------------------------------------------- fase 3, missão 4: o quiz na Sala de Reuniões

const meetingTable = FURNITURE.find((f) => f.label === 'Mesa de reunião');
if (!meetingTable) throw new Error('Mesa de reunião faltando no mapa');
/** A última cadeira do lado de cima da mesa de reunião (perto do quadro): onde o ESTAGIÁRIO senta para o quiz. */
export const MEETING_SEAT = {
  /** Em pé, atrás da cadeira (de onde ele senta). */
  approach: { x: meetingTable.x + 198, y: meetingTable.y + 4 },
  /** Base do desenho dele sentado: logo depois da borda de cima do tampo (parece que as pernas estão embaixo da mesa). */
  seat: { x: meetingTable.x + 198, y: meetingTable.y + 18 },
  /** O desenho sentado fica na frente da mesa (cobre o encosto da cadeira desenhado nela). */
  depth: meetingTable.y + meetingTable.h + 1,
};
/** Área (pés) que senta de novo na cadeira, se ele levantou sem terminar o quiz. */
export const MEETING_SEAT_ZONE: Rect = { x: MEETING_SEAT.approach.x - 26, y: MEETING_SEAT.approach.y - 14, w: 52, h: 20 };
/** Na ponta direita da mesa de reunião: onde o chefe espera o ESTAGIÁRIO. */
export const MEETING_BOSS = { x: meetingTable.x + meetingTable.w + 24, y: meetingTable.y + 44 };

// ------------------------------------------------------------ fase 3, missão 5: o aperto no banheiro

const urinals = FURNITURE.filter((f) => f.label.startsWith('Mictório'));
if (urinals.length !== 3) throw new Error('Os 3 mictórios do banheiro estão faltando no mapa');
/** Onde o ESTAGIÁRIO fica em pé, de frente para cada mictório (pés). */
export const URINAL_SPOTS: Point[] = urinals.map((f) => ({ x: f.x + f.w / 2, y: f.foot!.y + f.foot!.h + 12 }));
/** Chegou aqui = chegou num mictório: a faixa de chão em frente aos três. */
export const URINAL_ZONE: Rect = {
  x: urinals[0].x - 6,
  y: urinals[0].foot!.y + urinals[0].foot!.h,
  w: urinals[2].x + urinals[2].w + 6 - (urinals[0].x - 6),
  h: 34,
};
const wallWords = FURNITURE.find((f) => f.label === 'Palavras na parede');
if (!wallWords) throw new Error('Palavras na parede do banheiro faltando no mapa');
/** Centro das palavras rabiscadas na parede (a câmera chega perto delas antes do sonho). */
export const WALL_WORDS: Point = { x: wallWords.x + wallWords.w / 2, y: wallWords.y + wallWords.h / 2 };
/** Ponto de saída do banheiro (no corredor do meio, em frente à porta). */
export const BATHROOM_DOOR: Point = { x: t(43), y: t(20.5) };
