// Fase 4, missão 2: imprimir 10 cópias do documento "Reunião" para a vídeo chamada. A impressora da Sala de Impressão
// está off-line: os cabos de rede e de energia estão no chão, soltos dela. O desafio é ligar cada cabo na entrada certa
// da traseira (tem uma USB de pegadinha), confirmar, e depois imprimir pelo Word do PC da sala, com 10 cópias.
// Este arquivo não depende de React nem do Phaser (testado com vitest).

export type PlugId = 'rede' | 'energia';
export type PortId = 'rede' | 'usb' | 'energia';

export const PLUGS: Record<PlugId, { what: string; cable: string }> = {
  rede: { what: 'o conector do cabo de rede (RJ45)', cable: 'o cabo de rede' },
  energia: { what: 'o conector do cabo de energia', cable: 'o cabo de energia' },
};

export const PORTS: Record<PortId, { what: string; label: string }> = {
  rede: { what: 'a entrada de rede (LAN)', label: 'LAN' },
  usb: { what: 'a entrada USB', label: 'USB' },
  energia: { what: 'a entrada de energia (AC)', label: 'AC' },
};

/** Para onde vai cada ponta (dica quando não encaixa). */
export const PLUG_HINT: Record<PlugId, string> = {
  rede: 'O cabo de rede tem o conector RJ45, com uma travinha: vai na entrada LAN. A USB é para ligar direto num computador, e o PC da sala usa a impressora pela rede.',
  energia: 'O cabo de energia tem 3 furinhos e vai na entrada AC, a maior, embaixo das outras.',
};

export interface PrinterState {
  /** Onde cada ponta está ligada na traseira da impressora. */
  plugs: Partial<Record<PlugId, PortId>>;
  /** O ESTAGIÁRIO confirmou com os dois cabos ligados: a impressora ligou e ficou on-line. */
  on: boolean;
  /** As 10 cópias já saíram. */
  printed: boolean;
}

export const newPrinterState = (): PrinterState => ({ plugs: {}, on: false, printed: false });

/** Quantas cópias o chefe pediu. */
export const COPIES = 10;

export type Attempt = { ok: true; state: PrinterState } | { ok: false; reason: string };

const portUsed = (s: PrinterState, port: PortId) => Object.values(s.plugs).includes(port);

/** Levou a ponta `plug` até a entrada `port`: encaixa se for a entrada dela e estiver livre. */
export function tryPlug(s: PrinterState, plug: PlugId, port: PortId): Attempt {
  if (s.plugs[plug]) return { ok: false, reason: '' };
  if (portUsed(s, port)) return { ok: false, reason: 'Essa entrada já tem um cabo ligado.' };
  if (plug !== port) return { ok: false, reason: `Não encaixa: ${PLUGS[plug].what} não serve n${PORTS[port].what}. ${PLUG_HINT[plug]}` };
  return { ok: true, state: { ...s, plugs: { ...s.plugs, [plug]: port } } };
}

/** Os cabos que ainda faltam ligar na impressora. */
export const missingCables = (s: PrinterState) => (Object.keys(PLUGS) as PlugId[]).filter((p) => !s.plugs[p]);

/** Apertou Confirmar: com os dois cabos no lugar, a impressora liga e fica on-line. */
export function tryConfirm(s: PrinterState): Attempt {
  if (s.on) return { ok: false, reason: '' };
  const missing = missingCables(s).map((p) => PLUGS[p].cable);
  if (missing.length) return { ok: false, reason: `Ainda falta ligar ${missing.join(' e ')} na impressora.` };
  return { ok: true, state: { ...s, on: true } };
}

/** O que está escrito no campo Cópias → número (ou `null` se não for um número de 1 a 999). */
export function parseCopies(text: string): number | null {
  if (!/^\s*\d{1,3}\s*$/.test(text)) return null;
  const n = Number(text);
  return n >= 1 ? n : null;
}

/** Apertou Imprimir no Word: precisa da impressora on-line e de exatamente 10 cópias. */
export function tryPrint(s: PrinterState, copies: number | null): Attempt {
  if (s.printed) return { ok: false, reason: 'As cópias já foram impressas: é só pegar na impressora.' };
  if (!s.on)
    return {
      ok: false,
      reason: 'Não deu para imprimir: a impressora está off-line. Vá até ela, na Sala de Impressão, e veja o que está acontecendo.',
    };
  if (copies === null) return { ok: false, reason: 'O campo Cópias precisa de um número (de 1 a 999).' };
  if (copies !== COPIES)
    return {
      ok: false,
      reason: `O chefe pediu ${COPIES} cópias, e o campo Cópias está com ${copies}. Ajuste para ${COPIES} antes de imprimir.`,
    };
  return { ok: true, state: { ...s, printed: true } };
}
