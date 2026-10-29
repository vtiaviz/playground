import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import cena from '../assets/impressora/cena.json';
import ligadaPng from '../assets/impressora/ligada.png';
import traseiraPng from '../assets/impressora/traseira.png';
import { missingCables, PLUGS, PORTS, tryConfirm, tryPlug, type PlugId, type PortId, type PrinterState } from './impressao';

type Pt = [number, number];
const GEO = cena as unknown as {
  w: number;
  h: number;
  ports: Record<PortId, Pt>;
  plugs: Record<PlugId, Pt>;
  wall: Record<PlugId, Pt>;
  floor: Record<PlugId, Pt>;
};

const PORT_COLOR: Record<PortId, string> = { rede: '#3f7fd6', usb: '#c9ced6', energia: '#23262d' };
const CABLE_COLOR: Record<PlugId, string> = { rede: '#2f5f9e', energia: '#23262d' };
const LEGEND: { color: string; text: string }[] = [
  { color: PORT_COLOR.rede, text: 'Rede (LAN, conector RJ45)' },
  { color: PORT_COLOR.energia, text: 'Energia (AC)' },
  { color: PORT_COLOR.usb, text: 'USB' },
];
/** Folga (em pixels de arte) para aceitar a ponta perto da entrada. */
const SNAP = 7;

export interface ImpressoraModalProps {
  state: PrinterState;
  onChange: (state: PrinterState) => void;
  /** `true` = a impressora ligou (os dois cabos no lugar e confirmado). */
  onClose: (done: boolean) => void;
}

/**
 * A traseira da impressora da Sala de Impressão: os cabos de rede e de energia estão no chão (a outra ponta já está na
 * parede). Arrasta cada ponta até a entrada certa (LAN, AC; a USB é de pegadinha) e confirma: a impressora liga.
 */
export default function ImpressoraModal({ state, onChange, onClose }: ImpressoraModalProps) {
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [wire, setWire] = useState<{ plug: PlugId; x: number; y: number } | null>(null);
  const [note, setNote] = useState<{ text: string; tone: 'ok' | 'bad' | 'info' }>(() =>
    state.on
      ? { text: 'A impressora está ligada e on-line. Agora é no PC: abra o documento Reunião e imprima.', tone: 'ok' }
      : {
          text: 'Os cabos de rede e de energia estão no chão, soltos (a outra ponta de cada um já está na parede). Arraste cada ponta até a entrada certa na traseira da impressora.',
          tone: 'info',
        },
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  useEffect(() => cardRef.current?.focus(), []);
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  /** Ponto da tela → pixels de arte da cena (`null` = fora). */
  const toArt = (cx: number, cy: number) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return null;
    const x = ((cx - r.left) / r.width) * GEO.w;
    const y = ((cy - r.top) / r.height) * GEO.h;
    return x < 0 || y < 0 || x > GEO.w || y > GEO.h ? null : { x, y };
  };

  // puxando uma ponta: ela segue o ponteiro e, ao soltar perto de uma entrada, tenta encaixar
  useEffect(() => {
    if (!wire) return;
    const move = (e: PointerEvent) => {
      const at = toArt(e.clientX, e.clientY);
      if (at) setWire((w) => (w ? { ...w, ...at } : w));
    };
    const up = (e: PointerEvent) => {
      const plug = wire.plug;
      setWire(null);
      const at = toArt(e.clientX, e.clientY);
      if (!at) return;
      const port = (Object.keys(GEO.ports) as PortId[])
        .map((p) => ({ p, d: Math.hypot(GEO.ports[p][0] - at.x, GEO.ports[p][1] - at.y) }))
        .filter((c) => c.d <= SNAP)
        .sort((a, b) => a.d - b.d)[0]?.p;
      if (!port) return;
      const r = tryPlug(stateRef.current, plug, port);
      if (!r.ok) {
        if (r.reason) setNote({ text: r.reason, tone: 'bad' });
        return;
      }
      changeRef.current(r.state);
      setNote({
        text: missingCables(r.state).length
          ? `Encaixou ${PLUGS[plug].what} n${PORTS[port].what}.`
          : 'Os dois cabos estão ligados! Agora aperte ✓ Confirmar.',
        tone: 'ok',
      });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [wire?.plug]);

  const confirm = () => {
    const r = tryConfirm(state);
    if (!r.ok) {
      if (r.reason) setNote({ text: r.reason, tone: 'bad' });
      return;
    }
    onChange(r.state);
    setNote({
      text: 'A impressora ligou: a luz verde acendeu e o visor mostra ON. Volte ao PC para ver se ela ficou on-line.',
      tone: 'ok',
    });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    onClose(state.on);
  };

  const startWire = (plug: PlugId) => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const [x, y] = GEO.plugs[plug];
    setWire({ plug, x, y });
    setNote({ text: `Leve ${PLUGS[plug].what} até a entrada certa.`, tone: 'info' });
  };

  /** Onde a ponta está: na entrada, na mão (arrastando) ou no chão. */
  const plugAt = (plug: PlugId): Pt => {
    const port = state.plugs[plug];
    if (port) return GEO.ports[port];
    if (wire?.plug === plug) return [wire.x, wire.y];
    return GEO.plugs[plug];
  };
  /** O cabo desce da parede, encosta no chão e vai até a ponta. */
  const cablePath = (plug: PlugId) => {
    const [wx, wy] = GEO.wall[plug];
    const [fx, fy] = GEO.floor[plug];
    const [bx, by] = plugAt(plug);
    return `M${wx} ${wy} C${wx} ${wy + 26} ${fx} ${fy - 8} ${fx} ${fy} C${fx} ${fy + 8} ${bx + 10} ${by + 6} ${bx} ${by}`;
  };

  const plugs = Object.keys(GEO.plugs) as PlugId[];
  const usedPorts = new Set(Object.values(state.plugs));

  return createPortal(
    <div className="office-montar-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={onKeyDown}>
      <div className="office-montar-card office-imp-card" ref={cardRef} tabIndex={-1}>
        <header className="office-montar-head">
          <div>
            <p className="office-montar-kicker">Sala de Impressão · a impressora nova</p>
            <h2 id={titleId}>A traseira da impressora</h2>
            <p className="office-montar-order">
              <strong>Para ficar on-line:</strong> o cabo de rede (para o PC achar a impressora) e o de energia, cada um na sua entrada.
            </p>
          </div>
          <button type="button" onClick={() => onClose(state.on)}>
            {state.on ? 'Voltar ao escritório ▶' : '✕ Fechar (continua depois)'}
          </button>
        </header>

        <section className="office-montar-bench" aria-label="Traseira da impressora">
          <div className="office-montar-stage office-imp-stage" ref={stageRef}>
            <img src={traseiraPng} alt="" draggable={false} />
            {state.on && <img className="is-layer is-boot" src={ligadaPng} alt="" draggable={false} />}
            <svg className="office-montar-svg" viewBox={`0 0 ${GEO.w} ${GEO.h}`} aria-hidden="true">
              {plugs.map((p) => {
                const d = cablePath(p);
                return (
                  <g key={p}>
                    <path d={d} stroke="#1c1626" strokeWidth={2.6} fill="none" strokeLinecap="round" />
                    <path d={d} stroke={CABLE_COLOR[p]} strokeWidth={1.4} fill="none" strokeLinecap="round" />
                  </g>
                );
              })}
              {(Object.keys(GEO.ports) as PortId[]).map((p) => (
                <circle
                  key={p}
                  className={usedPorts.has(p) ? 'office-montar-port is-used' : 'office-montar-port is-socket'}
                  cx={GEO.ports[p][0]}
                  cy={GEO.ports[p][1]}
                  r={2.4}
                  fill={PORT_COLOR[p]}
                  data-port={p}
                >
                  <title>{PORTS[p].what}</title>
                </circle>
              ))}
              {plugs.map((p) => {
                const [x, y] = plugAt(p);
                const fixed = !!state.plugs[p];
                const [w, h] = p === 'rede' ? [5, 4] : [6.5, 5];
                return (
                  <rect
                    key={p}
                    className={fixed ? 'office-pj-plug is-fixed' : 'office-pj-plug'}
                    x={x - w / 2}
                    y={y - h / 2}
                    width={w}
                    height={h}
                    rx={0.8}
                    fill={p === 'rede' ? '#5f86c8' : '#23262d'}
                    data-plug={p}
                    onPointerDown={fixed ? undefined : startWire(p)}
                  >
                    <title>{PLUGS[p].what}</title>
                  </rect>
                );
              })}
            </svg>
          </div>
          <ul className="office-montar-legend" aria-label="Cores das entradas">
            {LEGEND.map((l) => (
              <li key={l.text}>
                <span style={{ background: l.color }} aria-hidden="true" /> {l.text}
              </li>
            ))}
          </ul>
          <p className={`office-montar-note is-${note.tone}`} role="status">
            {note.text}
          </p>
          <div className="office-montar-actions">
            {state.on ? (
              <button type="button" className="office-primary" autoFocus onClick={() => onClose(true)}>
                Voltar ao escritório ▶
              </button>
            ) : (
              <button type="button" className="office-primary" onClick={confirm}>
                ✓ Confirmar
              </button>
            )}
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
