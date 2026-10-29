import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import cursorUrl from '../assets/cursor-dedo.png';
import {
  BOOT_MS,
  pressPart,
  screenPhase,
  type PcModel,
  type PcPart,
  type PcState,
  type PressOutcome,
  type ScreenPhase,
} from './pcs';

export interface PcModalProps {
  /** Número da estação (0 a 5). */
  index: number;
  model: PcModel;
  state: PcState;
  /** Segundos que faltam para a equipe voltar da reunião. */
  secondsLeft: number;
  /** Cada clique que muda o computador (o jogo guarda o estado mesmo se o modal fechar). */
  onChange: (state: PcState) => void;
  /** `true` = colocou a placa LIBERADO; `false` = saiu sem placa. */
  onClose: (signed: boolean) => void;
}

// cores da arte (pixel art: retângulos de cor chapada com contorno escuro)
export const OUT = '#1d1f24';
const LED_OFF = '#3a3f47';
const LED_GREEN = '#4ade80';
const LED_AMBER = '#f6ad37';

export const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

/** Retângulo com contorno de 1 pixel. */
export function Box({ x, y, w, h, fill, out = OUT }: { x: number; y: number; w: number; h: number; fill: string; out?: string }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} fill={out} />
      <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} fill={fill} />
    </>
  );
}

/** Símbolo de ligar (⏻). */
function PowerGlyph({ cx, cy, r, color = '#fff' }: { cx: number; cy: number; r: number; color?: string }) {
  const a = (35 * Math.PI) / 180;
  const sx = r * Math.sin(a);
  const sy = r * Math.cos(a);
  return (
    <g stroke={color} strokeWidth={Math.max(0.35, r * 0.28)} fill="none" strokeLinecap="round">
      <path d={`M ${cx + sx} ${cy - sy} A ${r} ${r} 0 1 1 ${cx - sx} ${cy - sy}`} />
      <path d={`M ${cx} ${cy - r * 1.15} L ${cx} ${cy - r * 0.15}`} />
    </g>
  );
}

/** Símbolo de reiniciar (↻): parecido com o de ligar, para quem não presta atenção. */
function ResetGlyph({ cx, cy, r, color = '#fff' }: { cx: number; cy: number; r: number; color?: string }) {
  const w = Math.max(0.35, r * 0.28);
  const ex = cx - r * Math.sin(Math.PI / 3);
  const ey = cy - r * Math.cos(Math.PI / 3);
  return (
    <g stroke={color} strokeWidth={w} fill="none" strokeLinecap="round">
      <path d={`M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${ex} ${ey}`} />
      <path d={`M ${cx - r * 0.55} ${cy - r * 1.3} L ${cx} ${cy - r} L ${cx - r * 0.5} ${cy - r * 0.55}`} />
    </g>
  );
}

interface HotProps {
  part: PcPart;
  /** Descrição neutra para quem usa leitor de tela (não diz qual é o de ligar). */
  label: string;
  /** Área clicável extra (para botões pequenos). */
  hit?: [number, number, number, number];
  children: ReactNode;
}

type Press = (part: PcPart) => void;

/** Um pedaço clicável do computador. Sem destaque ao passar o mouse: o aluno precisa observar. */
function makeHot(press: Press) {
  return function Hot({ part, label, hit, children }: HotProps) {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        press(part);
      }
    };
    return (
      <g role="button" tabIndex={0} aria-label={label} className="office-hot" data-part={part} onClick={() => press(part)} onKeyDown={onKeyDown}>
        {children}
        {hit && <rect x={hit[0]} y={hit[1]} width={hit[2]} height={hit[3]} fill="transparent" />}
      </g>
    );
  };
}

type HotComponent = ReturnType<typeof makeHot>;

interface Scene {
  Hot: HotComponent;
  s: PcState;
  phase: ScreenPhase;
  now: number;
  owner: string;
  gradientId: string;
}

// ------------------------------------------------------------------ tela do monitor

function Screen({ x, y, w, h, sc }: { x: number; y: number; w: number; h: number; sc: Scene }) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const { phase } = sc;
  if (phase === 'desligado') {
    return (
      <g data-screen="desligado">
        <rect x={x} y={y} width={w} height={h} fill="#0d1117" />
        <polygon points={`${x + w * 0.55},${y} ${x + w * 0.75},${y} ${x + w * 0.45},${y + h} ${x + w * 0.25},${y + h}`} fill="#fff" opacity="0.05" />
      </g>
    );
  }
  if (phase === 'sem-sinal') {
    return (
      <g data-screen="sem-sinal">
        <rect x={x} y={y} width={w} height={h} fill="#050608" />
        <rect x={cx - 24} y={cy - 8} width={48} height={16} fill="#1b2a4a" stroke="#5b7fc7" strokeWidth={0.6} />
        <text x={cx} y={cy - 1} className="office-svg-text" fontSize={5} fill="#fff" textAnchor="middle">
          Sem sinal
        </text>
        <text x={cx} y={cy + 5} className="office-svg-text" fontSize={2.8} fill="#a9bde6" textAnchor="middle">
          Verifique o computador
        </text>
      </g>
    );
  }
  if (phase === 'iniciando') {
    const p = sc.s.bootAt === null ? 0 : Math.min(1, (sc.now - sc.s.bootAt) / BOOT_MS);
    return (
      <g data-screen="iniciando">
        <rect x={x} y={y} width={w} height={h} fill="#0b1a33" />
        <circle cx={cx} cy={cy - 6} r={7} fill="#36c3a0" />
        <path d={`M ${cx - 2.5} ${cy - 10} L ${cx + 3.5} ${cy - 6} L ${cx - 2.5} ${cy - 2} Z`} fill="#0b1a33" />
        <text x={cx} y={cy + 8} className="office-svg-text" fontSize={3.6} fill="#e6edf7" textAnchor="middle">
          Iniciando…
        </text>
        <rect x={cx - 20} y={cy + 11} width={40} height={3} fill="#22324f" />
        <rect x={cx - 20} y={cy + 11} width={40 * p} height={3} fill="#36c3a0" />
      </g>
    );
  }
  // login: a prova de que está tudo certo
  return (
    <g data-screen="login">
      <defs>
        <linearGradient id={sc.gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b6cb0" />
          <stop offset="1" stopColor="#6b46c1" />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill={`url(#${sc.gradientId})`} />
      <text x={x + 3} y={y + 6} className="office-svg-text" fontSize={3.6} fill="#fff">
        08:00
      </text>
      <circle cx={cx} cy={cy - 9} r={8} fill="#e2e8f0" />
      <circle cx={cx} cy={cy - 11} r={3} fill="#718096" />
      <path d={`M ${cx - 5} ${cy - 3} Q ${cx} ${cy - 9} ${cx + 5} ${cy - 3} Z`} fill="#718096" />
      <text x={cx} y={cy + 4.5} className="office-svg-text" fontSize={4.4} fill="#fff" fontWeight="bold" textAnchor="middle">
        {sc.owner}
      </text>
      <rect x={cx - 20} y={cy + 7} width={34} height={6} fill="#fff" />
      <text x={cx - 18} y={cy + 11.2} className="office-svg-text" fontSize={3} fill="#8a94a6">
        Senha
      </text>
      <rect x={cx + 15} y={cy + 7} width={6} height={6} fill="#36c3a0" />
      <path d={`M ${cx + 16.5} ${cy + 10} L ${cx + 19.5} ${cy + 10} M ${cx + 18.3} ${cy + 8.8} L ${cx + 19.5} ${cy + 10} L ${cx + 18.3} ${cy + 11.2}`} stroke="#fff" strokeWidth={0.5} fill="none" />
    </g>
  );
}

const monitorLed = (sc: Scene) => (!sc.s.monitorOn ? LED_OFF : sc.s.caseOn ? LED_GREEN : LED_AMBER);
const caseLed = (sc: Scene) => (sc.s.caseOn ? LED_GREEN : LED_OFF);

/** Pé do monitor: pescoço + base. `bottom` = onde a base encosta. */
function Stand({ cx, top, bottom, color }: { cx: number; top: number; bottom: number; color: string }) {
  return (
    <>
      <Box x={cx - 6} y={top} w={12} h={bottom - top - 3} fill={color} />
      <Box x={cx - 20} y={bottom - 4} w={40} h={4} fill={color} />
    </>
  );
}

function Logo({ x, y, text, color, Hot }: { x: number; y: number; text: string; color: string; Hot: HotComponent }) {
  return (
    <Hot part="logo" label="Nome do fabricante" hit={[x - 9, y - 3.5, 18, 5]}>
      <text x={x} y={y} className="office-svg-text" fontSize={3} fill={color} textAnchor="middle" fontWeight="bold">
        {text}
      </text>
    </Hot>
  );
}

// ------------------------------------------------------------------ monitores

/** Clássico: botão redondo no canto de baixo, à direita (o mais fácil). */
function MonitorClassico({ sc }: { sc: Scene }) {
  const { Hot } = sc;
  return (
    <g>
      <Stand cx={104} top={86} bottom={100} color="#2d3239" />
      <Box x={48} y={14} w={112} h={74} fill="#2d3239" />
      <Screen x={53} y={19} w={102} h={60} sc={sc} />
      <Logo x={104} y={85} text="PIXEL" color="#8d96a3" Hot={Hot} />
      <rect x={141} y={83} width={2} height={1} fill={monitorLed(sc)} />
      <Hot part="monitor-ligar" label="Botão redondo no canto de baixo do monitor" hit={[145, 80, 9, 8]}>
        <circle cx={149.5} cy={83.6} r={2.4} fill="#4a5059" stroke={OUT} strokeWidth={0.5} />
        <PowerGlyph cx={149.5} cy={83.8} r={1.2} color="#c9d1db" />
      </Hot>
    </g>
  );
}

/** Menu: cinco botõezinhos embaixo da borda; o de ligar é o último. */
function MonitorMenu({ sc }: { sc: Scene }) {
  const { Hot } = sc;
  const nubs = [124, 130, 136, 142];
  return (
    <g>
      <Stand cx={104} top={84} bottom={100} color="#15171b" />
      <Box x={48} y={14} w={112} h={70} fill="#15171b" />
      <Screen x={51} y={17} w={106} h={62} sc={sc} />
      <Logo x={104} y={82.4} text="NOVA" color="#5d6470" Hot={Hot} />
      {nubs.map((x, i) => (
        <Hot key={x} part="menu-monitor" label={`Botão ${i + 1} embaixo do monitor`} hit={[x - 1, 82, 6, 5]}>
          <rect x={x} y={84} width={4} height={1.6} fill="#2c3036" />
          <rect x={x + 1.5} y={81.6} width={1} height={0.6} fill="#4a505a" />
        </Hot>
      ))}
      <Hot part="monitor-ligar" label="Botão 5 embaixo do monitor" hit={[147, 81, 7, 6]}>
        <rect x={148} y={84} width={4} height={1.6} fill="#2c3036" />
        <circle cx={150} cy={82} r={0.7} fill="none" stroke="#4a505a" strokeWidth={0.3} />
      </Hot>
      <rect x={155} y={81.5} width={1.5} height={1} fill={monitorLed(sc)} />
    </g>
  );
}

/** Lateral: botões na lateral direita do monitor (vista um pouco de lado). */
function MonitorLateral({ sc, top }: { sc: Scene; top: number }) {
  const { Hot } = sc;
  return (
    <g>
      <Stand cx={104} top={top + 72} bottom={top + 84} color="#3b4048" />
      <polygon points={`160,${top + 2} 165,${top + 5} 165,${top + 70} 160,${top + 73}`} fill="#262a30" stroke={OUT} strokeWidth={0.5} />
      <Box x={48} y={top} w={112} h={74} fill="#3b4048" />
      <Screen x={53} y={top + 5} w={102} h={60} sc={sc} />
      <Logo x={104} y={top + 71} text="LUMA" color="#9aa3af" Hot={Hot} />
      <rect x={151} y={top + 69.5} width={2} height={1} fill={monitorLed(sc)} />
      <Hot part="monitor-ligar" label="Botão comprido na lateral do monitor" hit={[159.5, top + 24, 7, 10]}>
        <rect x={161.5} y={top + 26} width={2.4} height={6} fill="#4d535c" stroke={OUT} strokeWidth={0.4} />
      </Hot>
      {[38, 44].map((d, i) => (
        <Hot key={d} part="menu-monitor" label={`Botão pequeno ${i + 1} na lateral do monitor`} hit={[159.5, top + d - 1, 7, 6]}>
          <rect x={161.5} y={top + d} width={2.4} height={3} fill="#4d535c" stroke={OUT} strokeWidth={0.4} />
        </Hot>
      ))}
    </g>
  );
}

/** Toque: borda fininha; o botão é um pontinho sensível ao toque no canto. */
function MonitorToque({ sc }: { sc: Scene }) {
  const { Hot } = sc;
  return (
    <g>
      <Stand cx={104} top={84} bottom={100} color="#2a2d33" />
      <Hot part="webcam" label="Pecinha em cima do monitor" hit={[98, 9, 12, 6]}>
        <Box x={99} y={11} w={10} h={4} fill="#2a2d33" />
        <circle cx={104} cy={13} r={0.9} fill="#111" stroke="#4a5b7a" strokeWidth={0.3} />
      </Hot>
      <Box x={48} y={14} w={112} h={71} fill="#2a2d33" />
      <Screen x={50} y={16} w={108} h={64} sc={sc} />
      <Logo x={104} y={83.4} text="SLIM" color="#4b5059" Hot={Hot} />
      <Hot part="monitor-ligar" label="Pontinho no canto de baixo do monitor" hit={[150, 80, 9, 5]}>
        <circle cx={155} cy={82.4} r={0.9} fill="#383c44" />
      </Hot>
      {sc.s.monitorOn && <rect x={152} y={82} width={1} height={0.8} fill={monitorLed(sc)} />}
    </g>
  );
}

/** Centro: o botão fica no meio da borda (onde costuma ficar o nome da marca). */
function MonitorCentro({ sc }: { sc: Scene }) {
  const { Hot } = sc;
  return (
    <g>
      <Stand cx={104} top={86} bottom={100} color="#9aa1a9" />
      <Box x={48} y={14} w={112} h={74} fill="#a9b0b8" />
      <rect x={52} y={18} width={104} height={62} fill="#8a9199" />
      <Screen x={53} y={19} w={102} h={60} sc={sc} />
      <Logo x={62} y={85} text="VIEW" color="#5a616a" Hot={Hot} />
      <Hot part="monitor-ligar" label="Botão no meio de baixo do monitor" hit={[100, 80, 8, 8]}>
        <circle cx={104} cy={84} r={1.8} fill="#c6ccd3" stroke="#5a616a" strokeWidth={0.4} />
      </Hot>
      <rect x={108} y={83.5} width={1.6} height={1} fill={monitorLed(sc)} />
      {[138, 144, 150].map((x, i) => (
        <Hot key={x} part="menu-monitor" label={`Botão ${i + 1} à direita, embaixo do monitor`} hit={[x - 3, 81, 6, 6]}>
          <circle cx={x} cy={84} r={1.3} fill="#c6ccd3" stroke="#5a616a" strokeWidth={0.4} />
        </Hot>
      ))}
    </g>
  );
}

/** Tudo-em-um: computador e tela numa peça só; o botão fica na lateral esquerda. */
function TudoEmUm({ sc }: { sc: Scene }) {
  const { Hot } = sc;
  return (
    <g>
      <polygon points="96,90 112,90 120,101 88,101" fill="#d9dce0" stroke={OUT} strokeWidth={0.6} />
      <polygon points="36,12 41,9 41,91 36,88" fill="#cfd2d6" stroke={OUT} strokeWidth={0.5} />
      <Box x={40} y={8} w={132} h={84} fill="#f2f3f5" />
      <Screen x={44} y={13} w={124} h={66} sc={sc} />
      <Hot part="webcam" label="Bolinha em cima da tela" hit={[102, 8, 8, 5]}>
        <circle cx={106} cy={10.6} r={0.9} fill="#222" />
      </Hot>
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={50 + i * 3} y={84} width={1.5} height={4} fill="#c3c7cc" />
      ))}
      <Logo x={106} y={88} text="ONE" color="#9aa1aa" Hot={Hot} />
      <rect x={160} y={86} width={2} height={1} fill={caseLed(sc)} />
      <Hot part="monitor-ligar" label="Botão na lateral esquerda" hit={[34, 25, 7, 10]}>
        <rect x={37} y={27} width={2.6} height={5} fill="#b6babf" stroke={OUT} strokeWidth={0.4} />
      </Hot>
      <Hot part="usb" label="Entradas na lateral esquerda" hit={[34, 50, 7, 12]}>
        <rect x={37.2} y={52} width={2.2} height={3} fill="#2b2f36" />
        <rect x={37.2} y={57} width={2.2} height={3} fill="#2b2f36" />
      </Hot>
    </g>
  );
}

// ------------------------------------------------------------------ gabinetes

/** Torre: botão redondo grande com ⏻ (o mais fácil). */
function CaseTorre({ sc }: { sc: Scene }) {
  const { Hot } = sc;
  return (
    <g>
      <Box x={180} y={30} w={36} h={82} fill="#e3e6ea" />
      <rect x={183} y={33} width={30} height={76} fill="#d5d9de" />
      <Hot part="dvd" label="Gaveta comprida no alto do gabinete" hit={[184, 36, 28, 8]}>
        <Box x={185} y={37} w={26} h={6} fill="#c9ced4" />
        <rect x={187} y={40} width={16} height={0.6} fill="#8d949c" />
        <rect x={206} y={40} width={3} height={1.2} fill="#8d949c" />
      </Hot>
      <Hot part="gabinete-ligar" label="Botão redondo grande" hit={[191, 52, 12, 12]}>
        <circle cx={198} cy={58} r={5} fill="#b9c0c8" stroke={OUT} strokeWidth={0.7} />
        <PowerGlyph cx={198} cy={58.3} r={2.5} color="#5d6570" />
      </Hot>
      <rect x={190} y={66} width={2} height={1.4} fill={caseLed(sc)} />
      <Hot part="reset" label="Botão redondo pequeno" hit={[203, 63, 6, 6]}>
        <circle cx={206} cy={66.5} r={1.4} fill="#b9c0c8" stroke={OUT} strokeWidth={0.5} />
      </Hot>
      <Hot part="usb" label="Entradas retangulares" hit={[187, 72, 22, 6]}>
        <rect x={189} y={74} width={5} height={2} fill="#2b2f36" />
        <rect x={201} y={74} width={5} height={2} fill="#2b2f36" />
      </Hot>
      {[86, 90, 94, 98, 102].map((y) => (
        <rect key={y} x={188} y={y} width={20} height={1} fill="#b3b9c0" />
      ))}
    </g>
  );
}

/** Gamer: ventoinhas coloridas na frente; o botão de ligar fica no teto do gabinete. */
function CaseGamer({ sc }: { sc: Scene }) {
  const { Hot } = sc;
  const on = sc.s.caseOn;
  const fans = [
    { cy: 50, c: '#ff4fd8' },
    { cy: 70, c: '#4fd1ff' },
    { cy: 90, c: '#7cff6b' },
  ];
  return (
    <g>
      <polygon points="176,33 181,27 229,27 224,33" fill="#30333b" stroke={OUT} strokeWidth={0.6} />
      <Box x={176} y={32} w={49} h={80} fill="#1a1b20" />
      <rect x={179} y={35} width={2} height={74} fill={on ? '#a78bfa' : '#2c2e35'} />
      <Hot part="ventoinha" label="Círculos grandes na frente" hit={[188, 40, 26, 62]}>
        {fans.map((f) => (
          <g key={f.cy}>
            <circle cx={201} cy={f.cy} r={8.5} fill="#101114" stroke={on ? f.c : '#3a3d45'} strokeWidth={1.2} />
            <circle cx={201} cy={f.cy} r={2} fill={on ? f.c : '#3a3d45'} />
            <path d={`M 201 ${f.cy - 7} L 201 ${f.cy + 7} M 194 ${f.cy} L 208 ${f.cy}`} stroke="#25272e" strokeWidth={1} />
          </g>
        ))}
      </Hot>
      <Hot part="led" label="Botão pequeno na parte de baixo da frente" hit={[196, 102, 10, 6]}>
        <rect x={198.5} y={104} width={5} height={2} fill="#3a3d45" stroke={OUT} strokeWidth={0.4} />
      </Hot>
      <Hot part="usb" label="Entradas em cima do gabinete" hit={[185, 27, 13, 6]}>
        <rect x={187} y={29} width={3.5} height={1.6} fill="#0d0e11" />
        <rect x={192.5} y={29} width={3.5} height={1.6} fill="#0d0e11" />
      </Hot>
      <Hot part="led" label="Botão pequeno em cima do gabinete, no meio" hit={[202, 26.5, 7, 6]}>
        <circle cx={205} cy={29.8} r={1.1} fill="#4a4e57" />
      </Hot>
      <Hot part="gabinete-ligar" label="Botão em cima do gabinete, no fundo" hit={[213, 26.5, 9, 6]}>
        <circle cx={217} cy={29.8} r={1.7} fill="#5b606a" stroke={OUT} strokeWidth={0.4} />
        <circle cx={217} cy={29.8} r={0.7} fill={on ? LED_GREEN : '#2a2c32'} />
      </Hot>
    </g>
  );
}

/** Horizontal (desktop): fica deitado embaixo do monitor; o botão é o quadrado da direita. */
function CaseHorizontal({ sc }: { sc: Scene }) {
  const { Hot } = sc;
  return (
    <g>
      <Box x={36} y={90} w={136} h={24} fill="#d8cfb8" />
      <rect x={38} y={92} width={132} height={1} fill="#e8e0cc" />
      <Hot part="dvd" label="Gaveta comprida à esquerda" hit={[42, 94, 50, 13]}>
        <Box x={44} y={96} w={46} h={6} fill="#cbc1a8" />
        <rect x={47} y={99} width={30} height={0.6} fill="#9b927d" />
        <rect x={84} y={104} width={4} height={1.5} fill="#9b927d" />
      </Hot>
      <Hot part="leitor-cartao" label="Fenda fininha no meio" hit={[98, 95, 22, 5]}>
        <rect x={100} y={97} width={18} height={1} fill="#4b4536" />
      </Hot>
      <Hot part="usb" label="Entradas retangulares no meio" hit={[98, 102, 22, 6]}>
        <rect x={101} y={104} width={5} height={2} fill="#2b2f36" />
        <rect x={111} y={104} width={5} height={2} fill="#2b2f36" />
      </Hot>
      <rect x={146} y={108} width={2} height={1.2} fill={caseLed(sc)} />
      <Hot part="gabinete-ligar" label="Botão quadrado à direita" hit={[148, 95, 12, 13]}>
        <Box x={150} y={97} w={8} h={8} fill="#c6bca2" />
      </Hot>
      <Hot part="reset" label="Botão redondo pequeno à direita" hit={[160, 98, 7, 7]}>
        <circle cx={163.5} cy={101.5} r={1.5} fill="#c6bca2" stroke={OUT} strokeWidth={0.5} />
      </Hot>
    </g>
  );
}

/** Mini PC: caixinha ao lado do monitor; o botão é bem pequeno, em cima. */
function CaseMini({ sc }: { sc: Scene }) {
  const { Hot } = sc;
  return (
    <g>
      <polygon points="184,99 188,94 224,94 220,99" fill="#5b616b" stroke={OUT} strokeWidth={0.6} />
      <Box x={184} y={98} w={37} h={14} fill="#454a53" />
      <text x={190} y={103} className="office-svg-text" fontSize={2.4} fill="#7c838e">
        mini
      </text>
      <Hot part="usb" label="Entradas na frente da caixinha" hit={[187, 104, 13, 5]}>
        <rect x={188} y={106} width={4} height={1.6} fill="#1c1e22" />
        <rect x={194} y={106} width={4} height={1.6} fill="#1c1e22" />
      </Hot>
      <Hot part="leitor-cartao" label="Fenda fininha na frente da caixinha" hit={[201, 104, 9, 5]}>
        <rect x={202} y={106.4} width={7} height={0.8} fill="#1c1e22" />
      </Hot>
      <rect x={214} y={106} width={2} height={1.2} fill={caseLed(sc)} />
      <Hot part="gabinete-ligar" label="Pontinho em cima da caixinha" hit={[208, 93, 11, 6]}>
        <circle cx={213} cy={96.4} r={1.1} fill="#7a818c" stroke="#30343a" strokeWidth={0.3} />
      </Hot>
    </g>
  );
}

/** Escritório: dois botões iguais; o de ligar é o que tem ⏻ (o de cima é reiniciar). */
function CaseEscritorio({ sc }: { sc: Scene }) {
  const { Hot } = sc;
  return (
    <g>
      <Box x={180} y={36} w={36} h={76} fill="#3d434b" />
      <rect x={183} y={39} width={30} height={70} fill="#353a41" />
      <Hot part="reset" label="Botão retangular de cima" hit={[189, 46, 18, 9]}>
        <Box x={191} y={47} w={14} h={7} fill="#5a616b" />
        <ResetGlyph cx={198} cy={50.7} r={1.6} color="#c9d1db" />
      </Hot>
      <Hot part="gabinete-ligar" label="Botão retangular de baixo" hit={[189, 56, 18, 9]}>
        <Box x={191} y={57} w={14} h={7} fill="#5a616b" />
        <PowerGlyph cx={198} cy={60.9} r={1.6} color="#c9d1db" />
      </Hot>
      <rect x={197} y={67} width={2} height={1.2} fill={caseLed(sc)} />
      <Hot part="dvd" label="Gaveta comprida no meio" hit={[184, 72, 28, 10]}>
        <Box x={185} y={74} w={26} h={6} fill="#2c3036" />
        <rect x={187} y={77} width={16} height={0.6} fill="#5a616b" />
      </Hot>
      <Hot part="leitor-cartao" label="Fenda fininha" hit={[187, 83, 22, 5]}>
        <rect x={189} y={85} width={18} height={1} fill="#16181b" />
      </Hot>
      <Hot part="usb" label="Entradas retangulares embaixo" hit={[187, 89, 22, 6]}>
        <rect x={190} y={91} width={5} height={2} fill="#16181b" />
        <rect x={201} y={91} width={5} height={2} fill="#16181b" />
      </Hot>
    </g>
  );
}

// ------------------------------------------------------------------ mesa

function Keyboard({ Hot, y, color = '#d0d4d8' }: { Hot: HotComponent; y: number; color?: string }) {
  return (
    <Hot part="teclado" label="Teclado">
      <Box x={68} y={y} w={74} h={13} fill={color} />
      {[0, 1, 2].map((r) =>
        Array.from({ length: 13 }, (_, k) => (
          <rect key={`${r}-${k}`} x={71 + k * 5.3} y={y + 2.2 + r * 3.4} width={4} height={2.4} fill="#f4f5f7" stroke="#9aa1aa" strokeWidth={0.3} />
        )),
      )}
    </Hot>
  );
}

function Mouse({ Hot, y, color = '#d0d4d8' }: { Hot: HotComponent; y: number; color?: string }) {
  return (
    <Hot part="mouse" label="Mouse">
      <rect x={150} y={y + 1} width={10} height={6} fill="#6f5233" opacity={0.35} />
      <ellipse cx={154} cy={y + 5} rx={4} ry={6} fill={color} stroke={OUT} strokeWidth={0.6} />
      <path d={`M 154 ${y - 1} L 154 ${y + 4}`} stroke="#8d949c" strokeWidth={0.5} />
    </Hot>
  );
}

function Sign() {
  return (
    <g data-sign="liberado" className="office-desk-sign">
      <polygon points="14,124 20,104 44,104 50,124" fill="#1f6f3a" stroke={OUT} strokeWidth={0.8} />
      <rect x={18} y={106} width={28} height={12} fill="#2fb35a" stroke="#e9ffe9" strokeWidth={0.6} />
      <text x={32} y={113.6} className="office-svg-text" fontSize={4.4} fill="#fff" fontWeight="bold" textAnchor="middle">
        LIBERADO
      </text>
    </g>
  );
}

function DeskScene({ model, sc, signed }: { model: PcModel; sc: Scene; signed: boolean }) {
  const { Hot } = sc;
  const horizontal = model.caseType === 'horizontal';
  const white = model.caseType === null;
  const monitor = (() => {
    switch (model.monitorType) {
      case 'classico':
        return <MonitorClassico sc={sc} />;
      case 'menu':
        return <MonitorMenu sc={sc} />;
      case 'lateral':
        return <MonitorLateral sc={sc} top={horizontal ? 4 : 14} />;
      case 'toque':
        return <MonitorToque sc={sc} />;
      case 'centro':
        return <MonitorCentro sc={sc} />;
      case 'tudo-em-um':
        return <TudoEmUm sc={sc} />;
    }
  })();
  const pc = (() => {
    switch (model.caseType) {
      case 'torre':
        return <CaseTorre sc={sc} />;
      case 'gamer':
        return <CaseGamer sc={sc} />;
      case 'horizontal':
        return <CaseHorizontal sc={sc} />;
      case 'mini':
        return <CaseMini sc={sc} />;
      case 'escritorio':
        return <CaseEscritorio sc={sc} />;
      default:
        return null;
    }
  })();
  return (
    <>
      {/* parede e mesa */}
      <rect x={0} y={0} width={240} height={92} fill="#dfe6e9" />
      <rect x={0} y={82} width={240} height={10} fill="#c9d3d8" />
      <rect x={6} y={14} width={30} height={22} fill="#b9895a" stroke={OUT} strokeWidth={0.6} />
      <rect x={9} y={17} width={8} height={7} fill="#fff6b0" />
      <rect x={19} y={18} width={13} height={9} fill="#ffd0d0" />
      <rect x={11} y={27} width={10} height={6} fill="#c9f0ff" />
      <rect x={0} y={92} width={240} height={40} fill="#b07a46" />
      <rect x={0} y={92} width={240} height={1.5} fill="#c99260" />
      <rect x={0} y={132} width={240} height={6} fill="#7d5230" />
      <rect x={0} y={138} width={240} height={12} fill="#3a2a1c" />
      {/* sombra dos aparelhos na mesa */}
      <rect x={44} y={99} width={124} height={4} fill="#6f5233" opacity={0.3} />
      {horizontal ? (
        <>
          {pc}
          {monitor}
        </>
      ) : (
        <>
          {monitor}
          {pc}
        </>
      )}
      <Keyboard Hot={Hot} y={horizontal ? 117 : 108} color={white ? '#f2f3f5' : undefined} />
      <Mouse Hot={Hot} y={horizontal ? 117 : 108} color={white ? '#f2f3f5' : undefined} />
      {signed && <Sign />}
    </>
  );
}

/**
 * O computador da mesa visto de perto. O ESTAGIÁRIO leva o dedo (cursor) até os botões certos para
 * ligar o gabinete e o monitor; quando aparece a tela de login, coloca a placa LIBERADO.
 */
export default function PcModal({ index, model, state, secondsLeft, onChange, onClose }: PcModalProps) {
  const [s, setS] = useState(state);
  const [now, setNow] = useState(() => Date.now());
  const [feedback, setFeedback] = useState<Pick<PressOutcome, 'message' | 'tone'> | null>(null);
  const [signed, setSigned] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const gradientId = `office-login-${useId().replace(/:/g, '')}`;
  const phase = screenPhase(s, now);

  // relógio para a barra de "Iniciando…"
  useEffect(() => {
    if (phase !== 'iniciando') return;
    const id = window.setInterval(() => setNow(Date.now()), 120);
    return () => window.clearInterval(id);
  }, [phase]);

  // quando a tela de login aparece, o aluno sabe que pode colocar a placa
  const lastPhase = useRef(phase);
  useEffect(() => {
    if (lastPhase.current === 'iniciando' && phase === 'login') {
      setFeedback({ message: `Apareceu a tela de login de ${model.owner}: está tudo certo!`, tone: 'ok' });
    }
    lastPhase.current = phase;
  }, [phase, model.owner]);

  useEffect(() => {
    cardRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  const press: Press = (part) => {
    if (signed) return;
    const t = Date.now();
    const r = pressPart(model, s, part, t);
    setS(r.state);
    setNow(t);
    setFeedback({ message: r.message, tone: r.tone });
    if (r.state !== s) onChange(r.state);
  };

  const closeTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);
  const placeSign = () => {
    if (signed) return;
    setSigned(true);
    closeTimer.current = window.setTimeout(() => onClose(true), 900);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !signed) {
      e.stopPropagation();
      onClose(false);
    }
  };

  // Hot é o mesmo componente entre renderizações (senão o React recria os botões e o foco do teclado
  // se perde); só a função de clique muda, por isso ela fica numa referência.
  const pressRef = useRef(press);
  pressRef.current = press;
  const Hot = useMemo(() => makeHot((part) => pressRef.current(part)), []);
  const sc: Scene = { Hot, s, phase, now, owner: model.owner, gradientId };

  return createPortal(
    <div className="office-desk-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={onKeyDown}>
      <div className="office-desk-card" ref={cardRef} tabIndex={-1}>
        <header className="office-desk-head">
          <strong id={titleId}>
            Estação {index + 1} · mesa de {model.owner}
          </strong>
          <span className="office-desk-model">{model.name}</span>
          <span className="office-spacer" />
          <span className={secondsLeft <= 30 ? 'office-timer is-low' : 'office-timer'} aria-label={`Faltam ${formatTime(secondsLeft)}`}>
            ⏱ {formatTime(secondsLeft)}
          </span>
        </header>
        <p className="office-desk-tip">
          {model.caseType === null ? (
            <>
              Leve o dedo até o botão certo para ligar o <b>computador</b>.
            </>
          ) : (
            <>
              Leve o dedo até os botões certos para ligar o <b>gabinete</b> e o <b>monitor</b>.
            </>
          )}{' '}
          Só está tudo certo quando aparecer a <b>tela de login</b>.
        </p>
        <svg
          className="office-desk-scene"
          viewBox="0 0 240 150"
          shapeRendering="crispEdges"
          style={{ cursor: `url(${cursorUrl}) 11 0, pointer` }}
          data-phase={phase}
        >
          <DeskScene model={model} sc={sc} signed={signed} />
        </svg>
        <p className={`office-desk-msg tone-${feedback?.tone ?? 'idle'}`} aria-live="polite">
          {signed
            ? 'Placa LIBERADO colocada na mesa!'
            : (feedback?.message ?? 'Observe bem o gabinete e o monitor: nem todo botão fica no lugar de sempre.')}
        </p>
        <footer className="office-desk-actions">
          <button type="button" onClick={() => onClose(false)} disabled={signed}>
            Sair sem placa <kbd>Esc</kbd>
          </button>
          <button type="button" className="office-primary" onClick={placeSign} disabled={signed}>
            Colocar placa LIBERADO ✓
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
