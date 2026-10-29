// Missão 2: os computadores da Área de Trabalho. Cada estação tem um modelo diferente de gabinete e
// monitor; alguns com o botão de ligar em lugares pouco óbvios, para o aluno prestar atenção.

export type CaseType = 'torre' | 'gamer' | 'horizontal' | 'mini' | 'escritorio';
export type MonitorType = 'classico' | 'menu' | 'lateral' | 'toque' | 'centro' | 'tudo-em-um';

export interface PcModel {
  /** Tipo do computador, mostrado no topo do modal (sem entregar onde fica o botão). */
  name: string;
  /** Colega que trabalha nesta mesa (aparece na tela de login). */
  owner: string;
  /** null = computador tudo-em-um (o monitor é o próprio computador, um botão só). */
  caseType: CaseType | null;
  monitorType: MonitorType;
  /** Explicação mostrada depois, quando o colega reclama deste computador. */
  lesson: string;
}

/** Um modelo por estação, na ordem "Estação 1" … "Estação 6". */
export const PC_MODELS: PcModel[] = [
  {
    name: 'Gabinete torre + monitor',
    owner: 'Ana',
    caseType: 'torre',
    monitorType: 'classico',
    lesson: 'o gabinete liga no botão redondo grande (⏻) e o monitor no botão do canto de baixo.',
  },
  {
    name: 'Gabinete gamer + monitor',
    owner: 'Bruno',
    caseType: 'gamer',
    monitorType: 'menu',
    lesson: 'o gabinete gamer liga no botão de cima (no teto do gabinete) e o monitor no último botão embaixo da borda.',
  },
  {
    name: 'Gabinete horizontal (desktop) + monitor',
    owner: 'Carla',
    caseType: 'horizontal',
    monitorType: 'lateral',
    lesson: 'o gabinete deitado liga no botão quadrado da direita e o monitor tem o botão na lateral.',
  },
  {
    name: 'Computador tudo-em-um',
    owner: 'Diego',
    caseType: null,
    monitorType: 'tudo-em-um',
    lesson: 'no tudo-em-um, o computador e a tela são uma peça só: o botão fica na lateral esquerda.',
  },
  {
    name: 'Mini PC + monitor',
    owner: 'Elisa',
    caseType: 'mini',
    monitorType: 'toque',
    lesson: 'o mini PC liga no botãozinho em cima da caixa e o monitor tem um botão de toque no canto da borda.',
  },
  {
    name: 'Gabinete de escritório + monitor',
    owner: 'Fábio',
    caseType: 'escritorio',
    monitorType: 'centro',
    lesson: 'o gabinete tem dois botões iguais: o de ligar é o que tem o símbolo ⏻. O do monitor fica no meio da borda.',
  },
];

/** Tudo o que pode ser clicado na imagem. */
export type PcPart =
  | 'gabinete-ligar'
  | 'monitor-ligar'
  | 'reset'
  | 'dvd'
  | 'usb'
  | 'menu-monitor'
  | 'logo'
  | 'volume'
  | 'ventoinha'
  | 'led'
  | 'leitor-cartao'
  | 'teclado'
  | 'mouse'
  | 'webcam';

/** Dicas para os cliques que não ligam nada (ensinam o que é cada peça). */
export const PART_INFO: Partial<Record<PcPart, string>> = {
  dvd: 'Esse botão abre a gaveta do leitor de DVD. Não liga o computador.',
  usb: 'Isso é uma porta USB: serve para conectar pendrive, mouse, teclado…',
  'menu-monitor': 'Esse botão mexe no menu do monitor (brilho, contraste). Não é o de ligar.',
  logo: 'Isso é só o logotipo do fabricante.',
  volume: 'Esses botões controlam o volume do som.',
  ventoinha: 'É a ventoinha (cooler) com luz colorida: ela resfria o computador.',
  led: 'Esse botão só muda as cores das luzes do gabinete.',
  'leitor-cartao': 'Leitor de cartão de memória (de câmera, celular…).',
  teclado: 'O teclado serve para digitar. Ele não liga o computador.',
  mouse: 'O mouse move a setinha na tela. Ele não liga o computador.',
  webcam: 'Essa é a webcam, a câmera para chamadas de vídeo.',
};

export interface PcState {
  caseOn: boolean;
  monitorOn: boolean;
  /** Quando o computador começou a ligar (ms). A tela de login aparece depois de BOOT_MS. */
  bootAt: number | null;
  /** O ESTAGIÁRIO já colocou a placa LIBERADO nesta mesa. */
  sign: boolean;
}

export const BOOT_MS = 3500;

export const newPcState = (): PcState => ({ caseOn: false, monitorOn: false, bootAt: null, sign: false });

/** Ligado corretamente = computador ligado e monitor ligado (no tudo-em-um, um botão liga os dois). */
export const isPcReady = (s: PcState) => s.caseOn && s.monitorOn;

export type ScreenPhase = 'desligado' | 'sem-sinal' | 'iniciando' | 'login';

export function screenPhase(s: PcState, now: number): ScreenPhase {
  if (!s.monitorOn) return 'desligado';
  if (!s.caseOn) return 'sem-sinal';
  return s.bootAt !== null && now - s.bootAt < BOOT_MS ? 'iniciando' : 'login';
}

export interface PressOutcome {
  state: PcState;
  /** Mensagem curta para o aluno. */
  message: string;
  tone: 'ok' | 'info' | 'warn';
}

/** O que acontece ao clicar numa parte do computador. */
export function pressPart(model: PcModel, s: PcState, part: PcPart, now: number): PressOutcome {
  const allInOne = model.caseType === null;
  if (part === 'gabinete-ligar' || (allInOne && part === 'monitor-ligar')) {
    if (s.caseOn) {
      return {
        state: { ...s, caseOn: false, monitorOn: allInOne ? false : s.monitorOn, bootAt: null },
        message: 'Ops! Você desligou o computador. Um clique liga, outro clique desliga.',
        tone: 'warn',
      };
    }
    return {
      state: { ...s, caseOn: true, monitorOn: allInOne ? true : s.monitorOn, bootAt: now },
      message: allInOne
        ? 'Ligou! A luz acendeu e a tela está iniciando.'
        : s.monitorOn
          ? 'O computador ligou! Veja a tela iniciando.'
          : 'A luz do gabinete acendeu. E a tela? Confira o monitor.',
      tone: 'ok',
    };
  }
  if (part === 'monitor-ligar') {
    if (s.monitorOn) {
      return { state: { ...s, monitorOn: false }, message: 'Você desligou o monitor.', tone: 'warn' };
    }
    return {
      state: { ...s, monitorOn: true },
      message: s.caseOn ? 'Monitor ligado!' : 'O monitor ligou, mas está "Sem sinal": o computador ainda está desligado.',
      tone: s.caseOn ? 'ok' : 'info',
    };
  }
  if (part === 'reset') {
    if (s.caseOn) return { state: { ...s, bootAt: now }, message: 'Você reiniciou o computador (reset). Ele vai iniciar de novo.', tone: 'warn' };
    return { state: s, message: 'Esse é o botão de reiniciar (reset). Ele não liga um computador desligado.', tone: 'info' };
  }
  return { state: s, message: PART_INFO[part] ?? 'Isso não liga o computador.', tone: 'info' };
}

/** O que o colega vai encontrar ao sentar (para a bronca do chefe). */
export function diagnose(model: PcModel, s: PcState): string {
  if (isPcReady(s)) return 'está tudo certo';
  if (model.caseType === null || (!s.caseOn && !s.monitorOn)) return 'o computador ficou totalmente desligado';
  if (s.caseOn) return 'o computador ligou, mas o monitor ficou desligado (tela preta)';
  return 'o monitor ligou, mas o gabinete ficou desligado (a tela dizia "Sem sinal")';
}
