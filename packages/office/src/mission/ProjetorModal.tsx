import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import cena from '../assets/projetor/cena.json';
import forcaIcone from '../assets/projetor/forca-icone.png';
import forcaPng from '../assets/projetor/forca.png';
import projetorIcone from '../assets/projetor/projetor-icone.png';
import projetorPng from '../assets/projetor/projetor.png';
import salaPng from '../assets/projetor/sala.png';
import vgaIcone from '../assets/projetor/vga-icone.png';
import vgaPng from '../assets/projetor/vga.png';
import webcamIcone from '../assets/projetor/webcam-icone.png';
import webcamImagem from '../assets/projetor/webcam-imagem.png';
import webcamPng from '../assets/projetor/webcam.png';
import {
  focusBlur,
  focusOk,
  inBox,
  isReady,
  missingForPower,
  PLUGS,
  plugVisible,
  PORTS,
  portVisible,
  tryPlace,
  tryPlug,
  tryPowerOn,
  type DropTarget,
  type Item,
  type ItemId,
  type PlugId,
  type PlugKind,
  type PortId,
  type SetupState,
} from './projetor';

type Rect4 = [number, number, number, number];
type Pt = [number, number];
const GEO = cena as unknown as {
  w: number;
  h: number;
  slots: Record<'projetor' | 'webcam', Rect4>;
  table: Rect4;
  ports: Record<PortId, Pt>;
  plugs: Record<PlugId, Pt>;
  anchors: Record<'vga' | 'forca' | 'webcam', Pt>;
  screen: Rect4;
  wall: Rect4;
  lens: Pt;
  power: Rect4;
};

const ICONS: Record<ItemId, string> = { projetor: projetorIcone, vga: vgaIcone, forca: forcaIcone, webcam: webcamIcone };
const LAYERS: Record<ItemId, string> = { projetor: projetorPng, vga: vgaPng, forca: forcaPng, webcam: webcamPng };
/** Ordem de desenhar (os rolos dos cabos por baixo). */
const LAYER_ORDER: ItemId[] = ['vga', 'forca', 'projetor', 'webcam'];

export const KIND_COLOR: Record<PlugKind, string> = {
  vga: '#3f7fd6',
  hdmi: '#e5c34a',
  usb: '#c9ced6',
  energia: '#23262d',
  tomada: '#f4f5f7',
};
const CABLE_COLOR: Record<'vga' | 'forca' | 'webcam', string> = { vga: '#2f5f9e', forca: '#23262d', webcam: '#3a3f49' };
const LEGEND: { color: string; text: string }[] = [
  { color: KIND_COLOR.vga, text: 'VGA (imagem)' },
  { color: KIND_COLOR.usb, text: 'USB (webcam)' },
  { color: KIND_COLOR.energia, text: 'Energia do projetor' },
  { color: KIND_COLOR.tomada, text: 'Tomada' },
  { color: KIND_COLOR.hdmi, text: 'HDMI' },
];

/** Quanto tempo a tela de inicialização fica, e quanto demora a instalação do driver da webcam. */
const BOOT_MS = 1800;
const DRIVER_MS = 2800;
const BOX_CELLS = 6;
/** Folga (em pixels de arte) para aceitar a ponta perto da entrada. */
const SNAP = 7;

const inside = ([x, y, w, h]: Rect4, px: number, py: number, m = 0) => px >= x - m && px <= x + w + m && py >= y - m && py <= y + h + m;
const pct = ([x, y, w, h]: Rect4) => ({
  left: `${(x / GEO.w) * 100}%`,
  top: `${(y / GEO.h) * 100}%`,
  width: `${(w / GEO.w) * 100}%`,
  height: `${(h / GEO.h) * 100}%`,
});

export interface ProjetorModalProps {
  state: SetupState;
  onChange: (state: SetupState) => void;
  /** `true` = tudo pronto para a vídeo chamada e o ESTAGIÁRIO confirmou. */
  onClose: (done: boolean) => void;
}

type Drag = { item: Item; x: number; y: number };
type Wire = { plug: PlugId; x: number; y: number };

/** O que aparece na tela do notebook (e, igual, projetado na parede). */
function Tela({
  booting,
  state,
  installing,
  installed,
  onCamera,
}: {
  booting: boolean;
  state: SetupState;
  installing: boolean;
  installed: boolean;
  onCamera?: () => void;
}) {
  if (booting)
    return (
      <div className="office-pj-boot">
        <span className="office-pj-logo" aria-hidden="true" />
        <span>Iniciando…</span>
      </div>
    );
  return (
    <div className="office-pj-desktop">
      <button
        type="button"
        className={state.driver ? 'office-pj-icon' : 'office-pj-icon is-off'}
        onClick={onCamera}
        tabIndex={onCamera ? 0 : -1}
      >
        <span aria-hidden="true">📷</span>
        Câmera
      </button>
      <span className="office-pj-icon is-static">
        <span aria-hidden="true">🗑️</span>
        Lixeira
      </span>
      {state.camera && (
        <div className="office-pj-window">
          <div className="office-pj-window-bar">📷 Câmera</div>
          <img src={webcamImagem} alt="" draggable={false} />
          <span className="office-pj-live">● AO VIVO</span>
        </div>
      )}
      {(installing || installed) && (
        <div className="office-pj-toast">
          <strong>{installed ? '✓ Webcam USB pronta para usar' : '🔌 Novo dispositivo: Webcam USB'}</strong>
          {!installed && (
            <>
              <span>Instalando o driver…</span>
              <span className="office-pj-bar" />
            </>
          )}
        </div>
      )}
      <div className="office-pj-taskbar" />
    </div>
  );
}

/**
 * A mesa da Sala de Reuniões: o notebook (tela virada para o ESTAGIÁRIO), a parede com a tela de projeção e a tomada,
 * e a caixa com o projetor, os cabos e a webcam. Arrasta cada coisa para a mesa, liga as pontas, liga, ajusta o foco e
 * testa a câmera.
 */
export default function ProjetorModal({ state, onChange, onClose }: ProjetorModalProps) {
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [wire, setWire] = useState<Wire | null>(null);
  const [booting, setBooting] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installedToast, setInstalledToast] = useState(false);
  const [note, setNote] = useState<{ text: string; tone: 'ok' | 'bad' | 'info' }>(() =>
    state.on
      ? { text: 'Ajuste o foco da imagem na parede e teste a câmera (ícone 📷 na área de trabalho).', tone: 'info' }
      : {
          text: 'Arraste as coisas da caixa para a mesa: o projetor no espaço marcado e a webcam em cima da tela do notebook.',
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

  // ligou: o sistema carrega e depois instala o driver da webcam sozinho
  useEffect(() => {
    if (!state.on || state.driver || booting) return;
    const start = window.setTimeout(() => {
      setInstalling(true);
      setNote({ text: 'O sistema achou a webcam nova e está instalando o driver sozinho…', tone: 'info' });
    }, 700);
    const done = window.setTimeout(() => {
      setInstalling(false);
      setInstalledToast(true);
      changeRef.current({ ...stateRef.current, driver: true });
      setNote({
        text: 'Webcam instalada! Agora ajuste o foco da imagem na parede e teste a câmera: ícone 📷 Câmera na área de trabalho.',
        tone: 'ok',
      });
    }, 700 + DRIVER_MS);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(done);
    };
  }, [state.on, state.driver, booting]);

  useEffect(() => {
    if (!installedToast) return;
    const id = window.setTimeout(() => setInstalledToast(false), 3500);
    return () => window.clearTimeout(id);
  }, [installedToast]);

  /** Ponto da tela → pixels de arte da cena (`null` = fora). */
  const toArt = (cx: number, cy: number) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return null;
    const x = ((cx - r.left) / r.width) * GEO.w;
    const y = ((cy - r.top) / r.height) * GEO.h;
    return x < 0 || y < 0 || x > GEO.w || y > GEO.h ? null : { x, y };
  };

  // arrastando uma coisa da caixa: segue o ponteiro e, ao soltar, tenta pôr na mesa
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    const up = (e: PointerEvent) => {
      const item = drag.item;
      setDrag(null);
      const at = toArt(e.clientX, e.clientY);
      if (!at) return;
      const target: DropTarget = inside(GEO.slots.projetor, at.x, at.y, 6)
        ? 'projetor'
        : inside(GEO.slots.webcam, at.x, at.y, 6)
          ? 'webcam'
          : inside(GEO.table, at.x, at.y)
            ? 'mesa'
            : null;
      const r = tryPlace(stateRef.current, item.id, target);
      if (!r.ok) {
        if (r.reason) setNote({ text: r.reason, tone: 'bad' });
        return;
      }
      changeRef.current(r.state);
      const cable = item.id === 'vga' || item.id === 'forca' || item.id === 'webcam';
      setNote({
        text: inBox(r.state).length
          ? `${item.name} na mesa!${cable ? ' Arraste as pontas do cabo até as entradas certas.' : ''}`
          : 'Tudo na mesa! Agora ligue as pontas dos cabos: arraste cada ponta até a entrada certa.',
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
  }, [drag?.item.id]);

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
        .filter((p) => portVisible(stateRef.current, p))
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
      const left = missingForPower(r.state);
      setNote({
        text: left.length
          ? `Encaixou ${PLUGS[plug].what} n${PORTS[port].what}.`
          : 'Tudo ligado! Agora aperte ⏻ Ligar (o notebook e o projetor ligam juntos).',
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

  const powerOn = () => {
    if (state.on) return;
    const r = tryPowerOn(state);
    if (!r.ok) {
      if (r.reason) setNote({ text: r.reason, tone: 'bad' });
      return;
    }
    onChange(r.state);
    setBooting(true);
    setNote({ text: 'Ligando o notebook e o projetor…', tone: 'info' });
    window.setTimeout(() => setBooting(false), BOOT_MS);
  };

  const openCamera = () => {
    if (!state.driver) {
      setNote({ text: 'Espere o sistema terminar de instalar o driver da webcam.', tone: 'bad' });
      return;
    }
    const next = { ...state, camera: true };
    onChange(next);
    setNote(
      focusOk(next)
        ? { text: 'A imagem da webcam aparece no notebook e na parede, nítida. Tudo pronto para a vídeo chamada!', tone: 'ok' }
        : { text: 'A câmera abriu no notebook, mas na parede a imagem está embaçada: ajuste o foco do projetor.', tone: 'bad' },
    );
  };

  const setFocus = (v: number) => {
    const next = { ...state, focus: v };
    onChange(next);
    if (focusOk(next) && !focusOk(state))
      setNote(
        next.camera
          ? {
              text: 'Foco certo! A imagem da webcam aparece no notebook e na parede, nítida. Tudo pronto para a vídeo chamada!',
              tone: 'ok',
            }
          : { text: 'Foco certo: a imagem na parede ficou nítida! Agora teste a câmera (ícone 📷 na área de trabalho).', tone: 'ok' },
      );
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    onClose(isReady(state));
  };

  const startDrag = (item: Item) => (e: ReactPointerEvent) => {
    e.preventDefault();
    setDrag({ item, x: e.clientX, y: e.clientY });
    setNote({ text: `Solte ${item.the} em cima da mesa.`, tone: 'info' });
  };

  const startWire = (plug: PlugId) => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const [x, y] = GEO.plugs[plug];
    setWire({ plug, x, y });
    setNote({ text: `Leve ${PLUGS[plug].what} até a entrada certa.`, tone: 'info' });
  };

  /** Onde a ponta está: na entrada, na mão (arrastando) ou parada na mesa. */
  const plugAt = (plug: PlugId): Pt => {
    const port = state.plugs[plug];
    if (port) return GEO.ports[port];
    if (wire?.plug === plug) return [wire.x, wire.y];
    return GEO.plugs[plug];
  };
  const sag = ([x1, y1]: Pt, [x2, y2]: Pt) => `C${x1} ${y1 + 10} ${x2} ${y2 + 10} ${x2} ${y2}`;
  const cablePath = (a: Pt, mid: Pt, b: Pt) => `M${a[0]} ${a[1]} ${sag(a, mid)} ${sag(mid, b)}`;

  const box = inBox(state);
  const cells = [...box, ...Array<null>(Math.max(0, BOX_CELLS - box.length)).fill(null)];
  const ports = (Object.keys(GEO.ports) as PortId[]).filter((p) => portVisible(state, p));
  const plugs = (Object.keys(GEO.plugs) as PlugId[]).filter((p) => plugVisible(state, p));
  const usedPorts = new Set(Object.values(state.plugs));
  const ready = isReady(state);
  const showScreen = state.on;
  const blur = focusBlur(state);
  const screenProps = { booting, state, installing, installed: installedToast };

  return createPortal(
    <div className="office-montar-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={onKeyDown}>
      <div className="office-montar-card" ref={cardRef} tabIndex={-1}>
        <header className="office-montar-head">
          <div>
            <p className="office-montar-kicker">Sala de Reuniões · vídeo chamada com os clientes</p>
            <h2 id={titleId}>Instalar o projetor e a webcam</h2>
            <p className="office-montar-order">
              <strong>Para funcionar:</strong> a imagem do notebook na parede, nítida, e a webcam mostrando quem está na sala.
            </p>
          </div>
          <button type="button" onClick={() => onClose(ready)}>
            {ready ? 'Pronto ✓' : '✕ Fechar (continua depois)'}
          </button>
        </header>

        <section className="office-montar-bench" aria-label="Mesa da Sala de Reuniões">
          <div className="office-montar-stage office-pj-stage" ref={stageRef}>
            <img src={salaPng} alt="" draggable={false} />
            {LAYER_ORDER.filter((i) => state.placed.includes(i)).map((i) => (
              <img key={i} className="is-layer" src={LAYERS[i]} alt="" draggable={false} />
            ))}
            {showScreen && (
              <>
                <div className="office-pj-screen" style={pct(GEO.screen)}>
                  <Tela {...screenProps} onCamera={openCamera} />
                </div>
                <div
                  className="office-pj-screen is-wall"
                  style={{ ...pct(GEO.wall), filter: blur ? `blur(${blur}px) brightness(1.05)` : undefined }}
                  aria-hidden="true"
                >
                  <Tela {...screenProps} />
                </div>
              </>
            )}
            <svg className="office-montar-svg" viewBox={`0 0 ${GEO.w} ${GEO.h}`} aria-hidden="true">
              <defs>
                <linearGradient id={`${titleId}-beam`} x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0" stopColor="#fffbe0" stopOpacity="0.55" />
                  <stop offset="1" stopColor="#fffbe0" stopOpacity="0.08" />
                </linearGradient>
              </defs>
              {showScreen && !booting && (
                <polygon
                  className="office-pj-beam"
                  points={`${GEO.lens[0]},${GEO.lens[1]} ${GEO.wall[0]},${GEO.wall[1] + GEO.wall[3]} ${GEO.wall[0] + GEO.wall[2]},${GEO.wall[1] + GEO.wall[3]}`}
                  fill={`url(#${titleId}-beam)`}
                />
              )}
              {!state.placed.includes('projetor') && (
                <rect
                  className="office-montar-target"
                  x={GEO.slots.projetor[0]}
                  y={GEO.slots.projetor[1]}
                  width={GEO.slots.projetor[2]}
                  height={GEO.slots.projetor[3]}
                  rx={2}
                />
              )}
              {!state.placed.includes('webcam') && (
                <rect
                  className="office-montar-target"
                  x={GEO.slots.webcam[0]}
                  y={GEO.slots.webcam[1]}
                  width={GEO.slots.webcam[2]}
                  height={GEO.slots.webcam[3]}
                  rx={1.5}
                />
              )}
              {(['vga', 'forca'] as const)
                .filter((c) => state.placed.includes(c))
                .map((c) => {
                  const [a, b]: PlugId[] = c === 'vga' ? ['vga-a', 'vga-b'] : ['forca-plugue', 'forca-conector'];
                  const d = cablePath(plugAt(a), GEO.anchors[c], plugAt(b));
                  return (
                    <g key={c}>
                      <path d={d} stroke="#1c1626" strokeWidth={2.4} fill="none" strokeLinecap="round" />
                      <path d={d} stroke={CABLE_COLOR[c]} strokeWidth={1.3} fill="none" strokeLinecap="round" />
                    </g>
                  );
                })}
              {state.placed.includes('webcam') &&
                (() => {
                  // o fio da webcam desce pelo lado esquerdo da tela do notebook, sem passar na frente dela
                  const [ax, ay] = GEO.anchors.webcam;
                  const [bx, by] = plugAt('webcam-usb');
                  const side = Math.min(bx, GEO.screen[0] - 6);
                  const d = `M${ax} ${ay} C${ax - 14} ${ay - 5} ${side} ${ay - 2} ${side} ${ay + 14} L${side} ${by - 8} Q${side} ${by} ${bx} ${by}`;
                  return (
                    <g>
                      <path d={d} stroke="#1c1626" strokeWidth={1.8} fill="none" strokeLinecap="round" />
                      <path d={d} stroke={CABLE_COLOR.webcam} strokeWidth={0.9} fill="none" strokeLinecap="round" />
                    </g>
                  );
                })()}
              {ports.map((p) => (
                <circle
                  key={p}
                  className={usedPorts.has(p) ? 'office-montar-port is-used' : 'office-montar-port is-socket'}
                  cx={GEO.ports[p][0]}
                  cy={GEO.ports[p][1]}
                  r={2.4}
                  fill={KIND_COLOR[PORTS[p].kind]}
                  data-port={p}
                >
                  <title>{PORTS[p].what}</title>
                </circle>
              ))}
              {plugs.map((p) => {
                const [x, y] = plugAt(p);
                const fixed = !!state.plugs[p];
                return (
                  <rect
                    key={p}
                    className={fixed ? 'office-pj-plug is-fixed' : 'office-pj-plug'}
                    x={x - 2.4}
                    y={y - 1.8}
                    width={4.8}
                    height={3.6}
                    rx={0.8}
                    fill={KIND_COLOR[PLUGS[p].kind]}
                    data-plug={p}
                    onPointerDown={fixed ? undefined : startWire(p)}
                  >
                    <title>{PLUGS[p].what}</title>
                  </rect>
                );
              })}
              <rect
                className="office-montar-power"
                x={GEO.power[0] - 1}
                y={GEO.power[1] - 1}
                width={GEO.power[2] + 2}
                height={GEO.power[3] + 2}
                onClick={powerOn}
              >
                <title>Botão de ligar</title>
              </rect>
            </svg>
          </div>
          <ul className="office-montar-legend" aria-label="Cores das pontas e entradas">
            {LEGEND.map((l) => (
              <li key={l.text}>
                <span style={{ background: l.color }} aria-hidden="true" /> {l.text}
              </li>
            ))}
          </ul>
          <label className={state.on ? 'office-pj-focus' : 'office-pj-focus is-off'}>
            <span>🔍 Foco do projetor</span>
            <input
              type="range"
              min={0}
              max={100}
              value={state.focus}
              disabled={!state.on || booting}
              onChange={(e) => setFocus(Number(e.target.value))}
            />
            <strong className={focusOk(state) ? 'is-ok' : undefined}>
              {!state.on ? 'desligado' : focusOk(state) ? 'Foco OK ✓' : 'embaçado'}
            </strong>
          </label>
          <p className={`office-montar-note is-${note.tone}`} role="status">
            {note.text}
          </p>
          <div className="office-montar-actions">
            {ready ? (
              <button type="button" className="office-primary" autoFocus onClick={() => onClose(true)}>
                Pronto ✓
              </button>
            ) : (
              <button type="button" className="office-primary" onClick={powerOn} disabled={state.on}>
                ⏻ Ligar o notebook e o projetor
              </button>
            )}
          </div>
        </section>

        <section className="office-montar-box" aria-label="Caixa do projetor">
          <h3>📦 Na caixa</h3>
          <ul>
            {cells.map((it, k) =>
              it ? (
                <li key={it.id}>
                  <button
                    type="button"
                    className={drag?.item.id === it.id ? 'office-montar-cell is-dragging' : 'office-montar-cell'}
                    onPointerDown={startDrag(it)}
                    title={`${it.name} · ${it.spec}`}
                  >
                    <img src={ICONS[it.id]} alt="" draggable={false} />
                    <span>{it.name}</span>
                  </button>
                </li>
              ) : (
                <li key={`vazio-${k}`} className="office-montar-cell is-empty" aria-hidden="true" />
              ),
            )}
          </ul>
          {!box.length && <p className="office-montar-empty">A caixa está vazia: está tudo na mesa.</p>}
        </section>
      </div>
      {drag && (
        <img className="office-montar-ghost" src={ICONS[drag.item.id]} alt="" style={{ left: drag.x, top: drag.y }} draggable={false} />
      )}
    </div>,
    document.body,
  );
}
