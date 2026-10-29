import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import bancada from '../assets/montar/bancada.json';
import bancadaPng from '../assets/montar/bancada.png';
import coolerPng from '../assets/montar/cooler.png';
import fontePng from '../assets/montar/fonte.png';
import gabineteGamerIcone from '../assets/montar/gabinete-gamer-icone.png';
import gabineteGamerPng from '../assets/montar/gabinete-gamer.png';
import gabineteIcone from '../assets/montar/gabinete-icone.png';
import gabinetePng from '../assets/montar/gabinete.png';
import hdPng from '../assets/montar/hd.png';
import ledPng from '../assets/montar/led.png';
import placaMaePng from '../assets/montar/placa-mae.png';
import placaVideoPng from '../assets/montar/placa-video.png';
import processadorPng from '../assets/montar/processador.png';
import ram0GamerPng from '../assets/montar/ram-0-gamer.png';
import ram0Png from '../assets/montar/ram-0.png';
import ram1GamerPng from '../assets/montar/ram-1-gamer.png';
import ram1Png from '../assets/montar/ram-1.png';
import ssdPng from '../assets/montar/ssd.png';
import telaBootPng from '../assets/montar/tela-boot.png';
import {
  CABLE_NAME,
  inBox,
  PORTS,
  portVisible,
  SLOT_ORDER,
  SLOTS_OF,
  THE,
  tryBoot,
  tryCable,
  tryPlace,
  type Build,
  type BuildState,
  type CableType,
  type Piece,
  type PieceIcon,
  type PortId,
  type SlotId,
} from './montarPc';
import { PART_IMAGES } from './PecaNaMao';

type Rect4 = [number, number, number, number];
const GEO = bancada as unknown as { w: number; h: number; slots: Record<SlotId, Rect4>; ports: Record<PortId, [number, number]>; power: Rect4; screen: Rect4 };

const ICONS: Record<PieceIcon, string> = {
  gabinete: gabineteIcone,
  'gabinete-gamer': gabineteGamerIcone,
  'mb-matx': PART_IMAGES['mb-matx'],
  'cpu-lga': PART_IMAGES['cpu-lga'],
  cooler: PART_IMAGES.cooler,
  'ram-ddr4': PART_IMAGES['ram-ddr4'],
  'gpu-2': PART_IMAGES['gpu-2'],
  fonte: PART_IMAGES.fonte,
  'hd-35': PART_IMAGES['hd-35'],
  'ssd-sata': PART_IMAGES['ssd-sata'],
};

/** Camada (do tamanho da bancada) de cada peça encaixada. */
const layerOf = (slot: SlotId, gamer: boolean) =>
  ({
    gabinete: gamer ? gabineteGamerPng : gabinetePng,
    'placa-mae': placaMaePng,
    processador: processadorPng,
    cooler: coolerPng,
    'ram-0': gamer ? ram0GamerPng : ram0Png,
    'ram-1': gamer ? ram1GamerPng : ram1Png,
    'placa-video': placaVideoPng,
    fonte: fontePng,
    hd: hdPng,
    ssd: ssdPng,
  })[slot];

export const CABLE_COLOR: Record<CableType, string> = { p24: '#f4f4f4', spow: '#ffcc33', sdata: '#e0413a', pcie: '#a78bfa' };

/** Folga (em pixels de arte) em volta de cada lugar para aceitar a peça solta. */
const MARGIN = 5;
const BOX_CELLS = 12;

const inside = ([x, y, w, h]: Rect4, px: number, py: number, m = 0) => px >= x - m && px <= x + w + m && py >= y - m && py <= y + h + m;

export interface MontarPcModalProps {
  build: Build;
  state: BuildState;
  /** Box (1 a 3) para o título. */
  index: number;
  onChange: (state: BuildState) => void;
  /** `true` = ligou e o ESTAGIÁRIO confirmou que está pronto. */
  onClose: (done: boolean) => void;
}

type Drag = { piece: Piece; x: number; y: number };
type Wire = { from: PortId; x: number; y: number };

/**
 * A mesa de montagem: a bancada com o gabinete à esquerda e a caixa (mochila de quadradinhos) com as peças à direita.
 * Arrasta cada peça até o lugar dela, liga os cabos (de uma porta até a outra) e aperta o botão de ligar.
 */
export default function MontarPcModal({ build, state, index, onChange, onClose }: MontarPcModalProps) {
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const benchRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [wire, setWire] = useState<Wire | null>(null);
  const [note, setNote] = useState<{ text: string; tone: 'ok' | 'bad' | 'info' }>({
    text: 'Arraste as peças da caixa até o lugar delas no gabinete.',
    tone: 'info',
  });
  const [booting, setBooting] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => cardRef.current?.focus(), []);
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  /** Ponto da tela → pixels de arte da bancada (`null` = fora da bancada). */
  const toArt = (cx: number, cy: number) => {
    const r = benchRef.current?.getBoundingClientRect();
    if (!r) return null;
    const x = ((cx - r.left) / r.width) * GEO.w;
    const y = ((cy - r.top) / r.height) * GEO.h;
    return x < 0 || y < 0 || x > GEO.w || y > GEO.h ? null : { x, y };
  };

  // arrastando uma peça: segue o ponteiro e, ao soltar, tenta encaixar
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    const up = (e: PointerEvent) => {
      const piece = drag.piece;
      setDrag(null);
      const at = toArt(e.clientX, e.clientY);
      if (!at) return;
      const slot =
        piece.kind === 'gabinete'
          ? 'gabinete'
          : (SLOTS_OF[piece.kind].find((sl) => inside(GEO.slots[sl], at.x, at.y, MARGIN) && !stateRef.current.installed[sl]) ??
            SLOTS_OF[piece.kind].find((sl) => inside(GEO.slots[sl], at.x, at.y, MARGIN)) ??
            null);
      const r = tryPlace(build, stateRef.current, piece.id, slot);
      if (r.ok) {
        onChange(r.state);
        const left = inBox(build, r.state).length;
        setNote({
          text: left ? `Encaixou ${THE[piece.kind]}!` : 'Todas as peças no lugar! Agora ligue os cabos: arraste de uma bolinha até a outra da mesma cor.',
          tone: 'ok',
        });
      } else if (r.reason) setNote({ text: r.reason, tone: 'bad' });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [drag?.piece.id]);

  // puxando um cabo: a linha segue o ponteiro e, ao soltar perto de outra porta, tenta ligar
  useEffect(() => {
    if (!wire) return;
    const move = (e: PointerEvent) => {
      const at = toArt(e.clientX, e.clientY);
      if (at) setWire((w) => (w ? { ...w, ...at } : w));
    };
    const up = (e: PointerEvent) => {
      const from = wire.from;
      setWire(null);
      const at = toArt(e.clientX, e.clientY);
      if (!at) return;
      const target = (Object.keys(GEO.ports) as PortId[])
        .filter((p) => p !== from && portVisible(stateRef.current, p))
        .map((p) => ({ p, d: Math.hypot(GEO.ports[p][0] - at.x, GEO.ports[p][1] - at.y) }))
        .filter((c) => c.d <= 6)
        .sort((a, b) => a.d - b.d)[0]?.p;
      if (!target) return;
      const r = tryCable(stateRef.current, from, target);
      if (r.ok) {
        onChange(r.state);
        const device = PORTS[from].side === 'device' ? from : target;
        setNote({ text: `Cabo ligado n${PORTS[device].what}.`, tone: 'ok' });
      } else if (r.reason) setNote({ text: r.reason, tone: 'bad' });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [wire?.from]);

  const powerOn = () => {
    if (booting || state.booted) return;
    const r = tryBoot(build, state);
    if (!r.ok) {
      setNote({ text: r.reason, tone: 'bad' });
      return;
    }
    setBooting(true);
    setNote({ text: 'Ligando…', tone: 'info' });
    window.setTimeout(() => {
      setBooting(false);
      onChange(r.state);
      setNote({ text: `Ligou! Apareceu a tela de inicialização: o ${build.title.toLowerCase()} está pronto.`, tone: 'ok' });
    }, 900);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    onClose(state.booted);
  };

  const startDrag = (piece: Piece) => (e: ReactPointerEvent) => {
    if (state.booted) return;
    e.preventDefault();
    setDrag({ piece, x: e.clientX, y: e.clientY });
    setNote({ text: `Solte ${THE[piece.kind]} no lugar dela no gabinete.`, tone: 'info' });
  };

  const startWire = (from: PortId) => (e: ReactPointerEvent) => {
    if (state.booted) return;
    e.preventDefault();
    e.stopPropagation();
    const [x, y] = GEO.ports[from];
    setWire({ from, x, y });
  };

  const box = inBox(build, state);
  const cells = [...box, ...Array<null>(Math.max(0, BOX_CELLS - box.length)).fill(null)];
  // sem placa de vídeo, o cabo PCI Express da fonte fica guardado (não aparece)
  const hasGpu = build.pieces.some((p) => p.kind === 'placa-video');
  const visiblePorts = (Object.keys(GEO.ports) as PortId[]).filter((p) => portVisible(state, p) && (hasGpu || PORTS[p].type !== 'pcie'));
  const used = new Set(state.cables.flat());
  const allIn = !box.length;
  const legend = (Object.keys(CABLE_NAME) as CableType[]).filter((t) => visiblePorts.some((p) => PORTS[p].type === t));

  return createPortal(
    <div className="office-montar-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={onKeyDown}>
      <div className="office-montar-card" ref={cardRef} tabIndex={-1}>
        <header className="office-montar-head">
          <div>
            <p className="office-montar-kicker">Caixa {index} de 3</p>
            <h2 id={titleId}>{build.title}</h2>
            <p className="office-montar-order">
              <strong>Pedido:</strong> {build.order}
            </p>
          </div>
          <button type="button" onClick={() => onClose(state.booted)}>
            {state.booted ? 'Pronto ✓' : '✕ Fechar (continua depois)'}
          </button>
        </header>

        <section className="office-montar-bench" aria-label="Mesa de montagem">
          <div className={booting ? 'office-montar-stage is-booting' : 'office-montar-stage'} ref={benchRef}>
            <img src={bancadaPng} alt="" draggable={false} />
            {SLOT_ORDER.filter((sl) => state.installed[sl]).map((sl) => (
              <img key={sl} className="is-layer" src={layerOf(sl, build.gamer)} alt="" draggable={false} />
            ))}
            {(booting || state.booted) && <img className="is-layer" src={ledPng} alt="" draggable={false} />}
            {state.booted && <img className="is-layer is-boot" src={telaBootPng} alt="" draggable={false} />}
            <svg className="office-montar-svg" viewBox={`0 0 ${GEO.w} ${GEO.h}`} aria-hidden="true">
              {!state.installed.gabinete && (
                <rect className="office-montar-target" x={GEO.slots.gabinete[0]} y={GEO.slots.gabinete[1]} width={GEO.slots.gabinete[2]} height={GEO.slots.gabinete[3]} rx={2} />
              )}
              {state.booted && (
                <rect className="office-montar-progress" x={GEO.screen[0] + 13} y={GEO.screen[1] + GEO.screen[3] - 4} width={20} height={1.2} />
              )}
              {state.cables.map(([a, b]) => {
                const [x1, y1] = GEO.ports[a];
                const [x2, y2] = GEO.ports[b];
                const d = `M${x1} ${y1} C${x1 + 10} ${y1 + 6} ${x2 - 10} ${y2 + 6} ${x2} ${y2}`;
                return (
                  <g key={`${a}-${b}`}>
                    <path d={d} stroke="#1c1626" strokeWidth={2.6} fill="none" strokeLinecap="round" />
                    <path d={d} stroke={CABLE_COLOR[PORTS[a].type]} strokeWidth={1.4} fill="none" strokeLinecap="round" />
                  </g>
                );
              })}
              {wire && (
                <line
                  x1={GEO.ports[wire.from][0]}
                  y1={GEO.ports[wire.from][1]}
                  x2={wire.x}
                  y2={wire.y}
                  stroke={CABLE_COLOR[PORTS[wire.from].type]}
                  strokeWidth={1.4}
                  strokeDasharray="2 1"
                  strokeLinecap="round"
                />
              )}
              {visiblePorts.map((p) => (
                <circle
                  key={p}
                  className={used.has(p) ? 'office-montar-port is-used' : allIn ? 'office-montar-port is-waiting' : 'office-montar-port'}
                  cx={GEO.ports[p][0]}
                  cy={GEO.ports[p][1]}
                  r={2.2}
                  fill={CABLE_COLOR[PORTS[p].type]}
                  data-port={p}
                  onPointerDown={used.has(p) ? undefined : startWire(p)}
                >
                  <title>{PORTS[p].what}</title>
                </circle>
              ))}
              {state.installed.gabinete && (
                <rect
                  className="office-montar-power"
                  x={GEO.power[0]}
                  y={GEO.power[1]}
                  width={GEO.power[2]}
                  height={GEO.power[3]}
                  onClick={powerOn}
                >
                  <title>Botão de ligar</title>
                </rect>
              )}
            </svg>
          </div>
          {legend.length > 0 && (
            <ul className="office-montar-legend" aria-label="Cores dos cabos">
              {legend.map((t) => (
                <li key={t}>
                  <span style={{ background: CABLE_COLOR[t] }} aria-hidden="true" /> {CABLE_NAME[t]}
                </li>
              ))}
            </ul>
          )}
          <p className={`office-montar-note is-${note.tone}`} role="status">
            {note.text}
          </p>
          <div className="office-montar-actions">
            {state.booted ? (
              <button type="button" className="office-primary" autoFocus onClick={() => onClose(true)}>
                Pronto ✓
              </button>
            ) : (
              <button type="button" className="office-primary" onClick={powerOn} disabled={booting}>
                ⏻ Ligar o computador
              </button>
            )}
          </div>
        </section>

        <section className="office-montar-box" aria-label="Caixa com as peças">
          <h3>📦 Peças na caixa</h3>
          <ul>
            {cells.map((p, k) =>
              p ? (
                <li key={p.id}>
                  <button
                    type="button"
                    className={drag?.piece.id === p.id ? 'office-montar-cell is-dragging' : 'office-montar-cell'}
                    onPointerDown={startDrag(p)}
                    title={`${p.name} · ${p.spec}`}
                  >
                    <img src={ICONS[p.icon]} alt="" draggable={false} />
                    <span>{p.name}</span>
                  </button>
                </li>
              ) : (
                <li key={`vazio-${k}`} className="office-montar-cell is-empty" aria-hidden="true" />
              ),
            )}
          </ul>
          {!box.length && <p className="office-montar-empty">A caixa está vazia: todas as peças estão no gabinete.</p>}
        </section>
      </div>
      {drag && (
        <img className="office-montar-ghost" src={ICONS[drag.piece.icon]} alt="" style={{ left: drag.x, top: drag.y }} draggable={false} />
      )}
    </div>,
    document.body,
  );
}
