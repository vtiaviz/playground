import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import cursorUrl from '../assets/cursor-dedo.png';
import { ConnectorFace } from './Conectores';
import {
  allPlaced,
  allPlugged,
  ITEMS,
  itemName,
  placeItem,
  plugCable,
  port,
  PORTS,
  unplug,
  type Cable,
  type CableId,
  type ItemId,
  type Kit,
  type KitState,
  type PortId,
  type Shape,
} from './montagem';
import { Box, OUT } from './PcModal';

export interface MontagemModalProps {
  kit: Kit;
  state: KitState;
  /** Cada mudança (o jogo guarda o progresso mesmo se o modal fechar). */
  onChange: (state: KitState) => void;
  /** `true` = clicou em "Concluir montagem"; `false` = saiu para continuar depois. */
  onClose: (done: boolean) => void;
}

type Tone = 'ok' | 'info' | 'warn';
type DragKind = 'item' | 'cable';
interface Drag {
  kind: DragKind;
  id: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
  moved: boolean;
}

const CURSOR = `url(${cursorUrl}) 11 0, pointer`;

// ------------------------------------------------------------------ peças (ícones da caixa)

/** Ícone 32 × 32 de cada peça, para a "mochila" da caixa e para arrastar. */
export function ItemIcon({ id, size = 56 }: { id: ItemId; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" shapeRendering="crispEdges" aria-hidden="true">
      {id === 'monitor' && (
        <>
          <Box x={3} y={4} w={26} h={18} fill="#2d3239" />
          <rect x={5} y={6} width={22} height={13} fill="#163a5f" />
          <rect x={14} y={22} width={4} height={4} fill="#2d3239" />
          <Box x={9} y={25} w={14} h={3} fill="#2d3239" />
        </>
      )}
      {id === 'gabinete' && (
        <>
          <Box x={10} y={2} w={13} h={28} fill="#d5d9de" />
          <rect x={12} y={5} width={9} height={2} fill="#9aa1aa" />
          <circle cx={16.5} cy={12} r={2.2} fill="#9aa1aa" stroke={OUT} strokeWidth={0.5} />
          {[19, 21, 23, 25].map((y) => (
            <rect key={y} x={12} y={y} width={9} height={0.8} fill="#9aa1aa" />
          ))}
        </>
      )}
      {id === 'webcam' && (
        <>
          <Box x={8} y={9} w={16} h={10} fill="#2b2f37" />
          <circle cx={16} cy={14} r={3.4} fill="#111" stroke="#4a5b7a" strokeWidth={0.8} />
          <circle cx={15} cy={13} r={0.8} fill="#9ccfe0" />
          <rect x={13} y={19} width={6} height={3} fill="#2b2f37" />
          <Box x={10} y={22} w={12} h={3} fill="#3a3f47" />
        </>
      )}
      {id === 'caixas' && (
        <>
          {[3, 18].map((x) => (
            <g key={x}>
              <Box x={x} y={6} w={11} h={21} fill="#2b2f37" />
              <circle cx={x + 5.5} cy={12} r={3} fill="#4a505a" stroke={OUT} strokeWidth={0.5} />
              <circle cx={x + 5.5} cy={21} r={2} fill="#4a505a" stroke={OUT} strokeWidth={0.5} />
            </g>
          ))}
        </>
      )}
      {id === 'teclado' && (
        <>
          <Box x={1} y={10} w={30} h={12} fill="#d0d4d8" />
          {[0, 1, 2].map((r) =>
            Array.from({ length: 8 }, (_, k) => (
              <rect key={`${r}-${k}`} x={3 + k * 3.4} y={12 + r * 3} width={2.6} height={2.2} fill="#f4f5f7" stroke="#9aa1aa" strokeWidth={0.3} />
            )),
          )}
        </>
      )}
      {id === 'mouse' && (
        <>
          <ellipse cx={16} cy={17} rx={7} ry={10} fill="#d0d4d8" stroke={OUT} strokeWidth={1} />
          <path d="M 16 7 L 16 15 M 9.5 15 L 22.5 15" stroke="#8d949c" strokeWidth={0.8} />
        </>
      )}
    </svg>
  );
}

// ------------------------------------------------------------------ mesa (parte 1)

/** Lugares da mesa (onde cada peça encaixa), em unidades da cena 240 × 150. */
const SLOTS: Record<ItemId, [number, number, number, number][]> = {
  monitor: [[58, 14, 96, 86]],
  webcam: [[94, 4, 24, 12]],
  caixas: [
    [36, 58, 18, 42],
    [158, 58, 18, 42],
  ],
  gabinete: [[184, 24, 44, 90]],
  teclado: [[66, 104, 80, 18]],
  mouse: [[150, 103, 18, 20]],
};

function PlacedItem({ id }: { id: ItemId }) {
  switch (id) {
    case 'monitor':
      return (
        <g>
          <Box x={100} y={82} w={12} h={14} fill="#2d3239" />
          <Box x={86} y={94} w={40} h={5} fill="#2d3239" />
          <Box x={62} y={16} w={88} h={68} fill="#2d3239" />
          <rect x={66} y={20} width={80} height={56} fill="#0d1117" />
          <polygon points="110,20 124,20 100,76 86,76" fill="#fff" opacity={0.05} />
        </g>
      );
    case 'webcam':
      return (
        <g>
          <Box x={100} y={8} w={12} h={7} fill="#2b2f37" />
          <circle cx={106} cy={11.5} r={2} fill="#111" stroke="#4a5b7a" strokeWidth={0.5} />
          <rect x={102} y={15} width={8} height={2} fill="#2b2f37" />
        </g>
      );
    case 'caixas':
      return (
        <g>
          {[38, 160].map((x) => (
            <g key={x}>
              <Box x={x} y={62} w={14} h={36} fill="#2b2f37" />
              <circle cx={x + 7} cy={72} r={4} fill="#4a505a" stroke={OUT} strokeWidth={0.6} />
              <circle cx={x + 7} cy={88} r={3} fill="#4a505a" stroke={OUT} strokeWidth={0.6} />
            </g>
          ))}
        </g>
      );
    case 'gabinete':
      return (
        <g>
          <Box x={188} y={28} w={36} h={84} fill="#d5d9de" />
          <Box x={192} y={34} w={28} h={6} fill="#c3c9d0" />
          <circle cx={206} cy={54} r={4.5} fill="#b9c0c8" stroke={OUT} strokeWidth={0.6} />
          {[84, 88, 92, 96, 100].map((y) => (
            <rect key={y} x={194} y={y} width={24} height={1} fill="#a9b0b8" />
          ))}
        </g>
      );
    case 'teclado':
      return (
        <g>
          <Box x={68} y={106} w={76} h={14} fill="#d0d4d8" />
          {[0, 1, 2].map((r) =>
            Array.from({ length: 13 }, (_, k) => (
              <rect key={`${r}-${k}`} x={71 + k * 5.5} y={108.4 + r * 3.6} width={4.2} height={2.6} fill="#f4f5f7" stroke="#9aa1aa" strokeWidth={0.3} />
            )),
          )}
        </g>
      );
    case 'mouse':
      return (
        <g>
          <ellipse cx={159} cy={113} rx={5} ry={7.5} fill="#d0d4d8" stroke={OUT} strokeWidth={0.6} />
          <path d="M 159 105.5 L 159 111" stroke="#8d949c" strokeWidth={0.5} />
        </g>
      );
  }
}

function DeskFront({ room }: { room: Kit['room'] }) {
  return (
    <>
      <rect x={0} y={0} width={240} height={92} fill="#e6e0f0" />
      <rect x={0} y={82} width={240} height={10} fill="#d3cae3" />
      <rect x={10} y={14} width={22} height={28} fill="#fff" stroke={OUT} strokeWidth={0.6} />
      <text x={21} y={22} className="office-svg-text" fontSize={3.4} textAnchor="middle" fill="#7b4bb3" fontWeight="bold">
        {room === 'RH' ? 'RH' : 'R$'}
      </text>
      <rect x={14} y={26} width={14} height={1} fill="#c3c7cc" />
      <rect x={14} y={29} width={10} height={1} fill="#c3c7cc" />
      <rect x={14} y={32} width={12} height={1} fill="#c3c7cc" />
      <rect x={0} y={92} width={240} height={40} fill="#b07a46" />
      <rect x={0} y={92} width={240} height={1.5} fill="#c99260" />
      <rect x={0} y={132} width={240} height={6} fill="#7d5230" />
      <rect x={0} y={138} width={240} height={12} fill="#3a2a1c" />
    </>
  );
}

// ------------------------------------------------------------------ traseira (parte 2)

/** Posição (centro) e escala de cada entrada na traseira do gabinete. */
const PORT_POS: Record<PortId, { x: number; y: number; s: number }> = {
  energia: { x: 42, y: 30, s: 0.75 },
  'usb-1': { x: 40, y: 64, s: 0.55 },
  'usb-2': { x: 40, y: 75, s: 0.55 },
  'usb-3': { x: 62, y: 64, s: 0.55 },
  'usb-4': { x: 62, y: 75, s: 0.55 },
  rj45: { x: 86, y: 69, s: 0.6 },
  vga: { x: 47, y: 96, s: 0.55 },
  hdmi: { x: 78, y: 96, s: 0.6 },
  'p2-azul': { x: 106, y: 64, s: 0.6 },
  'p2-verde': { x: 106, y: 78, s: 0.6 },
  'p2-rosa': { x: 106, y: 92, s: 0.6 },
};
const PORT_HIT: Record<Shape, [number, number]> = { usb: [16, 10], vga: [22, 12], hdmi: [16, 10], rj45: [14, 14], p2: [10, 10], energia: [22, 18] };

const CABLE_STYLE: Record<CableId, { color: string; w: number; label: string }> = {
  video: { color: '#1f2b45', w: 2.4, label: 'monitor' },
  energia: { color: '#15171b', w: 2.6, label: 'força' },
  teclado: { color: '#3a3f47', w: 1.6, label: 'teclado' },
  mouse: { color: '#5a616b', w: 1.4, label: 'mouse' },
  webcam: { color: '#2b2f37', w: 1.4, label: 'webcam' },
  microfone: { color: '#2b2f37', w: 1.1, label: 'microfone' },
  som: { color: '#2b2f37', w: 1.1, label: 'som' },
  rede: { color: '#3a78c9', w: 1.8, label: 'rede' },
};

const cableX = (i: number) => 141 + i * 12.5;
const hangY = (i: number) => 104 + (i % 2) * 22;
/** A escala certa para a ponta de cada formato caber na cena. */
const PLUG_SCALE: Record<Shape, number> = { usb: 0.45, vga: 0.33, hdmi: 0.5, rj45: 0.6, p2: 0.65, energia: 0.55 };
const DETAIL_SCALE: Record<Shape, number> = { usb: 2.1, vga: 1.5, hdmi: 2.2, rj45: 1.7, p2: 2.4, energia: 1.8 };

function TowerBack() {
  return (
    <>
      <rect x={0} y={0} width={240} height={150} fill="#3b4250" />
      <rect x={0} y={0} width={240} height={8} fill="#7d5230" />
      <rect x={0} y={7} width={240} height={1.5} fill="#5a341b" />
      <Box x={18} y={14} w={106} h={134} fill="#c9ced4" />
      {/* fonte de energia */}
      <Box x={24} y={18} w={94} h={26} fill="#2b2f37" />
      <circle cx={92} cy={31} r={11} fill="#1d1f24" stroke="#4a505a" strokeWidth={0.8} />
      {[-6, -3, 0, 3, 6].map((d) => (
        <rect key={d} x={82} y={31 + d - 0.4} width={20} height={0.8} fill="#4a505a" />
      ))}
      <Box x={62} y={26} w={8} h={10} fill="#1d1f24" />
      <text x={66} y={33} className="office-svg-text" fontSize={3} fill="#c9ced4" textAnchor="middle">
        I/O
      </text>
      {/* painel traseiro da placa-mãe */}
      <Box x={26} y={52} w={92} h={58} fill="#aab1b9" />
      {/* tampas dos slots de expansão */}
      {[116, 122, 128, 134, 140].map((y) => (
        <rect key={y} x={30} y={y} width={84} height={4} fill="#b9bfc6" stroke="#8d949c" strokeWidth={0.4} />
      ))}
    </>
  );
}

// ------------------------------------------------------------------ modal

export default function MontagemModal({ kit, state, onChange, onClose }: MontagemModalProps) {
  const [s, setS] = useState(state);
  const [msg, setMsg] = useState<{ text: string; tone: Tone } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    cardRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  const update = (next: KitState) => {
    setS(next);
    onChange(next);
  };

  const say = (text: string, tone: Tone) => setMsg({ text, tone });

  const tryPlace = (item: ItemId, slot: ItemId) => {
    const r = placeItem(s, item, slot);
    say(r.message, r.ok ? 'ok' : 'warn');
    if (r.ok) {
      update(r.state);
      setSelected(null);
    }
  };

  const tryPlug = (cableId: CableId, portId: PortId) => {
    const r = plugCable(kit, s, cableId, portId);
    say(r.message, r.ok ? 'ok' : 'warn');
    if (r.ok) update(r.state);
  };

  /** Soltou o que estava arrastando em cima de um lugar da mesa ou de uma entrada. */
  const dropAt = (d: Drag, x: number, y: number) => {
    const hit = document.elementsFromPoint(x, y);
    if (d.kind === 'item') {
      const slot = hit.map((el) => el.closest('[data-slot]')).find(Boolean)?.getAttribute('data-slot') as ItemId | undefined;
      if (slot) tryPlace(d.id as ItemId, slot);
      else say(`${itemName(d.id as ItemId)} voltou para a caixa. Solte em cima de um lugar da mesa.`, 'info');
    } else {
      const p = hit.map((el) => el.closest('[data-port]')).find(Boolean)?.getAttribute('data-port') as PortId | undefined;
      if (p) tryPlug(d.id as CableId, p);
      setSelected(d.id);
    }
  };

  const pick = (d: Drag) => {
    if (d.kind === 'item') {
      const next = selected === d.id ? null : d.id;
      setSelected(next);
      if (next) say(`${itemName(next as ItemId)}: agora clique no lugar da mesa (ou arraste).`, 'info');
    } else {
      setSelected(d.id);
    }
  };

  const handlers = useRef({ dropAt, pick });
  handlers.current = { dropAt, pick };

  const begin = (e: ReactPointerEvent, kind: DragKind, id: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const d = { kind, id, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false };
    dragRef.current = d;
    setDrag(d);
  };

  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const moved = d.moved || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6;
      dragRef.current = { ...d, x: e.clientX, y: e.clientY, moved };
      setDrag(dragRef.current);
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!d) return;
      if (d.moved) handlers.current.dropAt(d, e.clientX, e.clientY);
      else handlers.current.pick(d);
    };
    const cancel = () => {
      dragRef.current = null;
      setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
    };
  }, [dragging]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (selected) setSelected(null);
      else onClose(false);
    }
  };

  const activeItem = (drag?.kind === 'item' && drag.moved ? drag.id : s.step === 'mesa' ? selected : null) as ItemId | null;
  const selectedCable = s.step === 'cabos' ? kit.cables.find((c) => c.id === selected) ?? null : null;
  const activeCable = drag?.kind === 'cable' ? kit.cables.find((c) => c.id === drag.id) ?? null : selectedCable;

  const buttonProps = (onActivate: () => void, label: string) => ({
    role: 'button',
    tabIndex: 0,
    'aria-label': label,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate();
      }
    },
  });

  // ---------------- parte 1: mesa + caixa
  const mesa = (
    <div className="office-mont-body">
      <svg className="office-desk-scene office-mont-scene" viewBox="0 0 240 150" shapeRendering="crispEdges" style={{ cursor: CURSOR }} data-step="mesa">
        <DeskFront room={kit.room} />
        {(['monitor', 'caixas', 'gabinete', 'webcam', 'teclado', 'mouse'] as ItemId[])
          .filter((id) => s.placed.includes(id))
          .map((id) => (
            <PlacedItem key={id} id={id} />
          ))}
        {(Object.keys(SLOTS) as ItemId[])
          .filter((id) => !s.placed.includes(id))
          .map((id) =>
            SLOTS[id].map(([x, y, w, h], k) => (
              <g
                key={`${id}-${k}`}
                data-slot={id}
                className="office-mont-slot"
                {...buttonProps(() => {
                  if (selected) tryPlace(selected as ItemId, id);
                  else say('Escolha uma peça da caixa primeiro (clique ou arraste).', 'info');
                }, `Lugar da mesa ${Object.keys(SLOTS).indexOf(id) + 1}${k ? ' (outro lado)' : ''}`)}
              >
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill={activeItem ? 'rgba(255,174,0,0.12)' : 'transparent'}
                  stroke={activeItem ? '#ffae00' : 'none'}
                  strokeWidth={0.8}
                  strokeDasharray="2 1.5"
                />
              </g>
            )),
          )}
      </svg>
      <aside className="office-mont-side" aria-label="Caixa">
        <h3>📦 Caixa {kit.index + 1}</h3>
        <div className="office-bag">
          {ITEMS.map((it) => {
            const placed = s.placed.includes(it.id);
            return (
              <button
                key={it.id}
                type="button"
                className={selected === it.id ? 'office-bag-slot is-selected' : 'office-bag-slot'}
                disabled={placed}
                data-item={it.id}
                aria-pressed={selected === it.id}
                onPointerDown={(e) => !placed && begin(e, 'item', it.id)}
                onClick={(e) => {
                  // teclado (Enter/Espaço): escolhe a peça; o mouse já é tratado no pointerdown/up
                  if (e.detail === 0 && !placed) pick({ kind: 'item', id: it.id, x: 0, y: 0, sx: 0, sy: 0, moved: false });
                }}
                style={{ cursor: placed ? 'default' : CURSOR }}
              >
                {placed ? <span className="office-bag-empty">✓</span> : <ItemIcon id={it.id} />}
                <span>{it.name}</span>
              </button>
            );
          })}
        </div>
        <p className="office-mont-help">Arraste cada peça da caixa até o lugar certo da mesa.</p>
      </aside>
    </div>
  );

  // ---------------- parte 2: traseira + cabos
  const plugged = (c: Cable) => s.plugs[c.id];
  const cabos = (
    <div className="office-mont-body">
      <svg className="office-desk-scene office-mont-scene" viewBox="0 0 240 150" shapeRendering="crispEdges" style={{ cursor: CURSOR }} data-step="cabos">
        <TowerBack />
        {PORTS.map((p) => {
          const pos = PORT_POS[p.id];
          const [hw, hh] = PORT_HIT[p.shape];
          return (
            <g
              key={p.id}
              data-port={p.id}
              className="office-mont-port"
              {...buttonProps(() => {
                if (selectedCable) tryPlug(selectedCable.id, p.id);
                else say('Escolha um cabo primeiro: clique na ponta dele.', 'info');
              }, `Entrada ${PORTS.indexOf(p) + 1}`)}
            >
              <ConnectorFace shape={p.shape} kind="port" cx={pos.x} cy={pos.y} s={pos.s} color={p.color} />
              <rect
                x={pos.x - hw / 2}
                y={pos.y - hh / 2}
                width={hw}
                height={hh}
                fill="transparent"
                stroke={activeCable && activeCable.shape === p.shape && drag ? '#ffae00' : 'none'}
                strokeWidth={0.5}
              />
            </g>
          );
        })}
        {kit.cables.map((c, i) => {
          const st = CABLE_STYLE[c.id];
          const x = cableX(i);
          const at = plugged(c);
          const isSel = selected === c.id;
          if (at) {
            const p = PORT_POS[at];
            return (
              <g key={c.id} data-cable={c.id} className="office-mont-cable" {...buttonProps(() => setSelected(c.id), `Cabo ${c.from} (conectado)`)}>
                {/* o fio passa por cima das outras entradas, mas não pode atrapalhar o clique nelas */}
                {isSel && <path d={`M ${x} 8 C ${x} 70 ${p.x + 40} ${p.y} ${p.x} ${p.y}`} stroke="#ffae00" strokeWidth={st.w + 1.6} fill="none" pointerEvents="none" />}
                <path d={`M ${x} 8 C ${x} 70 ${p.x + 40} ${p.y} ${p.x} ${p.y}`} stroke={st.color} strokeWidth={st.w} fill="none" pointerEvents="none" opacity={0.9} />
                {/* o plugue P2 fica menor que o anel da entrada, para dar para ver a cor dos dois */}
                <ConnectorFace shape={c.shape} kind="plug" cx={p.x} cy={p.y} s={p.s * (c.shape === 'p2' ? 0.55 : 0.9)} color={c.color} />
              </g>
            );
          }
          const y = hangY(i);
          return (
            <g
              key={c.id}
              data-cable={c.id}
              className="office-mont-cable"
              onPointerDown={(e) => begin(e, 'cable', c.id)}
              {...buttonProps(() => setSelected(c.id), `Cabo ${c.from}`)}
              onClick={(e) => {
                if (e.detail === 0) setSelected(c.id);
              }}
            >
              {isSel && <rect x={x - 6} y={y - 6} width={12} height={12} fill="none" stroke="#ffae00" strokeWidth={0.8} />}
              <path d={`M ${x} 8 L ${x} ${y - 4}`} stroke={st.color} strokeWidth={st.w} fill="none" />
              <ConnectorFace shape={c.shape} kind="plug" cx={x} cy={y} s={PLUG_SCALE[c.shape]} color={c.color} />
              <text
                x={x + 1.4}
                y={12}
                className="office-svg-text"
                fontSize={3.4}
                fill="#e6edf7"
                transform={`rotate(90 ${x + 1.4} 12)`}
              >
                {st.label}
              </text>
              <rect x={x - 6} y={8} width={12} height={y + 6 - 8} fill="transparent" />
            </g>
          );
        })}
      </svg>
      <aside className="office-mont-side" aria-label="Ponta do cabo">
        <h3>🔌 Ponta do cabo</h3>
        {selectedCable ? (
          <div className="office-plug-detail" data-detail={selectedCable.id}>
            <svg
              viewBox="-30 -18 60 36"
              shapeRendering="crispEdges"
              className="office-plug-zoom"
              style={{ cursor: plugged(selectedCable) ? 'default' : CURSOR }}
              onPointerDown={(e) => !plugged(selectedCable) && begin(e, 'cable', selectedCable.id)}
            >
              <rect x={-30} y={-18} width={60} height={36} fill="#f1ece0" />
              <ConnectorFace shape={selectedCable.shape} kind="plug" cx={0} cy={0} s={DETAIL_SCALE[selectedCable.shape]} color={selectedCable.color} />
            </svg>
            <strong>Cabo {selectedCable.from}</strong>
            {plugged(selectedCable) ? (
              <>
                <span className="office-plug-status is-on">
                  Conectado: {port(plugged(selectedCable)!).name}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    update(unplug(s, selectedCable.id));
                    say(`Cabo ${selectedCable.from} desconectado.`, 'info');
                  }}
                >
                  Desconectar
                </button>
              </>
            ) : (
              <span className="office-plug-status">Compare esta ponta com as entradas e arraste até a certa (ou clique na entrada).</span>
            )}
          </div>
        ) : (
          <p className="office-mont-help">Clique na ponta de um cabo pendurado para ver o encaixe de perto.</p>
        )}
        <ul className="office-cable-list">
          {kit.cables.map((c) => (
            <li key={c.id}>
              <button type="button" aria-pressed={selected === c.id} onClick={() => setSelected(c.id)}>
                <span aria-hidden="true">{plugged(c) ? '✅' : '🔌'}</span> {c.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );

  const ready = s.step === 'mesa' ? allPlaced(s) : allPlugged(kit, s);
  let ghost: ReactNode = null;
  if (drag?.moved) {
    const c = drag.kind === 'cable' ? kit.cables.find((k) => k.id === drag.id)! : null;
    ghost = (
      <div className="office-drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
        {c ? (
          <svg width={64} height={40} viewBox="-30 -18 60 36" shapeRendering="crispEdges">
            <ConnectorFace shape={c.shape} kind="plug" cx={0} cy={0} s={DETAIL_SCALE[c.shape] * 0.8} color={c.color} />
          </svg>
        ) : (
          <ItemIcon id={drag.id as ItemId} size={64} />
        )}
      </div>
    );
  }

  return createPortal(
    <div className="office-desk-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={onKeyDown}>
      <div className="office-desk-card office-mont-card" ref={cardRef} tabIndex={-1}>
        <header className="office-desk-head">
          <strong id={titleId}>
            Caixa {kit.index + 1} · {kit.name}
          </strong>
          <span className="office-desk-model">monitor com cabo {kit.video.toUpperCase()}</span>
          <span className="office-spacer" />
          <ol className="office-mont-steps">
            <li className={s.step === 'mesa' ? 'is-current' : 'is-done'}>1. Montar na mesa</li>
            <li className={s.step === 'cabos' ? 'is-current' : ''}>2. Ligar os cabos</li>
          </ol>
        </header>
        {s.step === 'mesa' ? mesa : cabos}
        <p className={`office-desk-msg tone-${msg?.tone ?? 'idle'}`} aria-live="polite">
          {msg?.text ??
            (s.step === 'mesa'
              ? 'Tire as peças da caixa e arrume o computador na mesa.'
              : 'Agora a parte de trás do gabinete: cada cabo vai numa entrada.')}
        </p>
        <footer className="office-desk-actions">
          <button type="button" onClick={() => onClose(false)}>
            Sair e continuar depois <kbd>Esc</kbd>
          </button>
          {s.step === 'mesa' ? (
            <button
              type="button"
              className="office-primary"
              disabled={!ready}
              onClick={() => {
                update({ ...s, step: 'cabos' });
                setSelected(null);
                setMsg(null);
              }}
            >
              Ir para a parte de trás ▶
            </button>
          ) : (
            <button
              type="button"
              className="office-primary"
              disabled={!ready}
              onClick={() => {
                const next = { ...s, done: true };
                update(next);
                onClose(true);
              }}
            >
              Concluir montagem ✓
            </button>
          )}
        </footer>
      </div>
      {ghost}
    </div>,
    document.body,
  );
}
