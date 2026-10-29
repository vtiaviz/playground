import type { Shape } from './montagem';

// Pontas dos cabos e entradas do gabinete vistas de frente, em pixel art (retângulos e polígonos de cor
// chapada). A mesma forma é usada no cabo e na entrada, para o aluno comparar.

const OUT = '#1d1f24';
const METAL = '#c9cfd6';
const METAL_D = '#8d949c';
const GOLD = '#e0b33a';
const HOLE = '#14161a';

export interface FaceProps {
  shape: Shape;
  /** Centro, em unidades do SVG. */
  cx: number;
  cy: number;
  /** Escala: 1 = mais ou menos 24 × 12 unidades. */
  s?: number;
  /** `plug` = ponta do cabo; `port` = entrada no gabinete. */
  kind: 'plug' | 'port';
  /** Cor do plugue/anel (áudio P2). */
  color?: string;
}

/** Desenha a frente de um conector. */
export function ConnectorFace({ shape, cx, cy, s = 1, kind, color }: FaceProps) {
  const sw = 0.6;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s})`}>
      {shape === 'usb' && <Usb kind={kind} sw={sw} />}
      {shape === 'vga' && <Vga kind={kind} sw={sw} />}
      {shape === 'hdmi' && <Hdmi kind={kind} sw={sw} />}
      {shape === 'rj45' && <Rj45 kind={kind} sw={sw} />}
      {shape === 'p2' && <P2 kind={kind} sw={sw} color={color ?? '#3a3f47'} />}
      {shape === 'energia' && <Energia kind={kind} sw={sw} />}
    </g>
  );
}

type K = { kind: 'plug' | 'port'; sw: number };

function Usb({ kind, sw }: K) {
  // retângulo de metal com a "língua" de plástico ocupando metade
  return (
    <>
      <rect x={-12} y={-5} width={24} height={10} fill={METAL} stroke={OUT} strokeWidth={sw} />
      <rect x={-10} y={-3} width={20} height={6} fill={HOLE} />
      <rect x={-10} y={kind === 'plug' ? 0 : -3} width={20} height={3} fill={kind === 'plug' ? '#f4f4f4' : '#2f6fd0'} />
      {[-7, -3, 1, 5].map((x) => (
        <rect key={x} x={x} y={kind === 'plug' ? 0 : -0.8} width={2} height={0.8} fill={GOLD} />
      ))}
    </>
  );
}

function Vga({ kind, sw }: K) {
  // D azul (trapézio) com 15 pinos em 3 fileiras e um parafuso de cada lado
  const pins: [number, number][] = [];
  for (const [row, n, off] of [
    [-2.6, 5, 0],
    [0, 5, -1],
    [2.6, 5, 0],
  ] as const) {
    for (let i = 0; i < n; i++) pins.push([-7 + off + i * 3.6 + (row === 0 ? 1.8 : 0), row]);
  }
  return (
    <>
      <rect x={-17} y={-6.5} width={34} height={13} fill={kind === 'plug' ? '#2a5aa8' : METAL} stroke={OUT} strokeWidth={sw} />
      <path d="M -11 -5 L 11 -5 L 9 5 L -9 5 Z" fill={kind === 'plug' ? METAL : HOLE} stroke={OUT} strokeWidth={sw} />
      <path d="M -9.5 -3.8 L 9.5 -3.8 L 8 3.8 L -8 3.8 Z" fill={kind === 'plug' ? '#1f3f78' : '#2a5aa8'} />
      {pins.map(([x, y]) => (
        <rect key={`${x}:${y}`} x={x - 0.6} y={y - 0.6} width={1.2} height={1.2} fill={kind === 'plug' ? GOLD : HOLE} />
      ))}
      {[-14.5, 14.5].map((x) => (
        <g key={x}>
          <circle cx={x} cy={0} r={2} fill={kind === 'plug' ? METAL : HOLE} stroke={OUT} strokeWidth={sw * 0.8} />
          <rect x={x - 1.2} y={-0.3} width={2.4} height={0.6} fill={kind === 'plug' ? METAL_D : '#555'} />
        </g>
      ))}
    </>
  );
}

function Hdmi({ kind, sw }: K) {
  // fino e largo, com os cantos de baixo cortados
  return (
    <>
      <path d="M -11 -4 L 11 -4 L 11 1 L 8 4 L -8 4 L -11 1 Z" fill={METAL} stroke={OUT} strokeWidth={sw} />
      <path d="M -9.5 -2.6 L 9.5 -2.6 L 9.5 0.6 L 7.2 2.6 L -7.2 2.6 L -9.5 0.6 Z" fill={HOLE} />
      <rect x={-7.5} y={kind === 'plug' ? 0 : -2} width={15} height={1.6} fill={kind === 'plug' ? '#2b2f37' : '#3a3f47'} />
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={-7 + i * 1.5} y={kind === 'plug' ? 0.3 : -1.7} width={0.7} height={1} fill={GOLD} />
      ))}
    </>
  );
}

function Rj45({ kind, sw }: K) {
  // quadradinho com 8 contatos dourados em cima e a trava embaixo
  const body = kind === 'plug' ? '#d6eef7' : HOLE;
  return (
    <>
      {kind === 'port' && <rect x={-9} y={-8} width={18} height={16} fill={METAL} stroke={OUT} strokeWidth={sw} />}
      <rect x={-6.5} y={-6} width={13} height={10} fill={body} stroke={OUT} strokeWidth={sw} />
      <rect x={-2.5} y={4} width={5} height={2.6} fill={body} stroke={OUT} strokeWidth={sw} />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={-5.3 + i * 1.4} y={-5.4} width={0.8} height={2.6} fill={GOLD} />
      ))}
      {kind === 'plug' && <rect x={-5.5} y={-1} width={11} height={4} fill="#9ccfe0" opacity={0.7} />}
      {kind === 'port' && (
        <>
          <rect x={-8} y={-7.6} width={2.4} height={1.4} fill="#4ade80" />
          <rect x={5.6} y={-7.6} width={2.4} height={1.4} fill="#f6ad37" />
        </>
      )}
    </>
  );
}

function P2({ kind, sw, color }: K & { color: string }) {
  // redondinho: o plugue tem a capa colorida; a entrada tem o anel colorido
  return kind === 'plug' ? (
    <>
      <circle cx={0} cy={0} r={6} fill={color} stroke={OUT} strokeWidth={sw} />
      <circle cx={0} cy={0} r={2.6} fill={METAL} stroke={OUT} strokeWidth={sw * 0.6} />
      <circle cx={0} cy={0} r={1} fill={METAL_D} />
    </>
  ) : (
    <>
      <circle cx={0} cy={0} r={5.5} fill={color} stroke={OUT} strokeWidth={sw} />
      <circle cx={0} cy={0} r={3.4} fill="#2b2f37" />
      <circle cx={0} cy={0} r={2.2} fill={HOLE} />
    </>
  );
}

function Energia({ kind, sw }: K) {
  // tomada do gabinete (C14): três pinos num encaixe com os cantos de baixo cortados
  return (
    <>
      {kind === 'port' && <rect x={-12} y={-9} width={24} height={18} fill="#2b2f37" stroke={OUT} strokeWidth={sw} />}
      <path d="M -9 -6.5 L 9 -6.5 L 9 2.5 L 5 6.5 L -5 6.5 L -9 2.5 Z" fill={kind === 'plug' ? '#23262c' : HOLE} stroke={kind === 'plug' ? OUT : '#555'} strokeWidth={sw} />
      {[
        [-4.5, -1.5],
        [4.5, -1.5],
        [0, 3.2],
      ].map(([x, y]) => (
        <rect
          key={`${x}:${y}`}
          x={x - (y > 0 ? 1.2 : 0.8)}
          y={y - (y > 0 ? 0.8 : 1.8)}
          width={y > 0 ? 2.4 : 1.6}
          height={y > 0 ? 1.6 : 3.6}
          fill={kind === 'plug' ? '#0b0c0e' : METAL}
        />
      ))}
    </>
  );
}
