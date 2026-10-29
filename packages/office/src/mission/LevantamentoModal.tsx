import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import desktopMontado from '../assets/equipamentos/desktop-montado.png';
import desktopTorre from '../assets/equipamentos/desktop-torre.png';
import desktopTudoEmUm from '../assets/equipamentos/desktop-tudo-em-um.png';
import mainframe from '../assets/equipamentos/mainframe.png';
import notebookClaro from '../assets/equipamentos/notebook-claro.png';
import notebookEscuro from '../assets/equipamentos/notebook-escuro.png';
import servidor from '../assets/equipamentos/servidor.png';
import smartphone from '../assets/equipamentos/smartphone.png';
import tablet from '../assets/equipamentos/tablet.png';
import {
  COMPUTER_TYPES,
  tally,
  tallyGroups,
  TYPE_INFO,
  type ComputerType,
  type DeviceImage,
  type DeviceTag,
  type Survey,
  type SurveyDevice,
} from './levantamento';

const IMAGES: Record<DeviceImage, string> = {
  'desktop-torre': desktopTorre,
  'desktop-tudo-em-um': desktopTudoEmUm,
  'desktop-montado': desktopMontado,
  'notebook-claro': notebookClaro,
  'notebook-escuro': notebookEscuro,
  servidor,
  mainframe,
  tablet,
  smartphone,
};

export interface LevantamentoModalProps {
  device: SurveyDevice;
  /** A prancheta inteira (para mostrar os traços dos outros equipamentos). */
  survey: Survey;
  onChange: (tag: DeviceTag) => void;
  onClose: () => void;
}

const SKIN = '#f2c29b';
const SKIN_D = '#d89a72';
const SLEEVE = '#5f9e2f';
const SLEEVE_D = '#447a1f';
const OUT = '#1c1626';

/** Mão do ESTAGIÁRIO (camisa verde) segurando a prancheta por baixo. A da direita é espelhada. */
function Hand({ side }: { side: 'left' | 'right' }) {
  return (
    <svg
      className={`office-clip-hand is-${side}`}
      viewBox="0 0 16 22"
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={side === 'right' ? { transform: 'scaleX(-1)' } : undefined}
    >
      <rect x={0} y={12} width={9} height={10} fill={OUT} />
      <rect x={1} y={13} width={7} height={9} fill={SLEEVE} />
      <rect x={1} y={13} width={2} height={9} fill={SLEEVE_D} />
      <rect x={3} y={2} width={10} height={12} fill={OUT} />
      <rect x={4} y={3} width={8} height={10} fill={SKIN} />
      <rect x={4} y={11} width={8} height={2} fill={SKIN_D} />
      <rect x={11} y={0} width={5} height={6} fill={OUT} />
      <rect x={12} y={1} width={3} height={4} fill={SKIN} />
    </svg>
  );
}

/** Traços da prancheta: grupos de 5 (o quinto corta os quatro). `fresh` = traço deste equipamento, em destaque. */
function Tally({ count, fresh }: { count: number; fresh: boolean }) {
  const groups = tallyGroups(count);
  if (!groups.length) return <span className="office-clip-empty">—</span>;
  return (
    <span className="office-clip-tally" aria-label={`${count} ${count === 1 ? 'traço' : 'traços'}`}>
      {groups.map((g, i) => {
        const last = i === groups.length - 1;
        return (
          <svg key={i} viewBox="0 0 26 20" width={26} height={20} aria-hidden="true">
            {Array.from({ length: Math.min(g, 4) }, (_, k) => (
              <line
                key={k}
                x1={4 + k * 5}
                y1={2}
                x2={3 + k * 5}
                y2={18}
                className={fresh && last && g < 5 && k === g - 1 ? 'is-fresh' : ''}
              />
            ))}
            {g === 5 && <line x1={0} y1={15} x2={22} y2={4} className={fresh && last ? 'is-fresh' : ''} />}
          </svg>
        );
      })}
    </span>
  );
}

/** Adesivo de etiquetagem (na cartela, sendo arrastado ou colado no equipamento). */
function Sticker({ type, small = false }: { type: ComputerType; small?: boolean }) {
  const t = TYPE_INFO[type];
  return (
    <span className={small ? 'office-sticker is-small' : 'office-sticker'} style={{ background: t.color }}>
      <span className="office-sticker-dot" aria-hidden="true" />
      {t.name.toUpperCase()}
    </span>
  );
}

type Drag = { type: ComputerType; x: number; y: number; sx: number; sy: number; moved: boolean; fromDevice: boolean };

/**
 * Fase 2, missão 1: o equipamento de perto. Resumo no alto, a imagem dele, a cartela de adesivos e a prancheta
 * na mão do ESTAGIÁRIO: clicar no tipo marca um traço e arrastar o adesivo até a imagem etiqueta o equipamento.
 */
export default function LevantamentoModal({ device, survey, onChange, onClose }: LevantamentoModalProps) {
  const [tag, setTag] = useState<DeviceTag>(survey[device.id] ?? { mark: null, sticker: null });
  const [picked, setPicked] = useState<ComputerType | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
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

  const update = (next: DeviceTag) => {
    setTag(next);
    onChange(next);
  };

  // a prancheta mostra os traços de todos, com o deste equipamento no estado atual
  const counts = tally({ ...survey, [device.id]: tag });

  const mark = (type: ComputerType) => {
    if (tag.mark === type) {
      update({ ...tag, mark: null });
      setMsg(`Traço apagado de ${TYPE_INFO[type].name}.`);
      return;
    }
    update({ ...tag, mark: type });
    setMsg(
      tag.mark
        ? `Traço trocado de ${TYPE_INFO[tag.mark].name} para ${TYPE_INFO[type].name}.`
        : `Traço marcado em ${TYPE_INFO[type].name}.${tag.sticker ? '' : ' Agora cole o adesivo no equipamento.'}`,
    );
  };

  /** Cola o adesivo no ponto (x, y) da tela, se estiver em cima da imagem do equipamento. */
  const stickAt = (type: ComputerType, x: number, y: number) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r || x < r.left || x > r.right || y < r.top || y > r.bottom) return false;
    const at = { x: Math.min(0.85, Math.max(0.15, (x - r.left) / r.width)), y: Math.min(0.9, Math.max(0.1, (y - r.top) / r.height)) };
    update({ ...tag, sticker: type, at });
    setPicked(null);
    setMsg(
      tag.sticker && tag.sticker !== type
        ? `Trocou o adesivo de ${TYPE_INFO[tag.sticker].name} pelo de ${TYPE_INFO[type].name}.`
        : `Adesivo de ${TYPE_INFO[type].name} colado.${tag.mark ? '' : ' Falta marcar o traço na prancheta.'}`,
    );
    return true;
  };

  const peel = () => {
    update({ ...tag, sticker: null, at: undefined });
    setMsg('Adesivo descolado.');
  };

  const handlers = useRef({ stickAt, peel });
  handlers.current = { stickAt, peel };

  const begin = (e: ReactPointerEvent, type: ComputerType, fromDevice: boolean) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const d = { type, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, fromDevice };
    dragRef.current = d;
    setDrag(d);
  };

  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = { ...d, x: e.clientX, y: e.clientY, moved: d.moved || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6 };
      setDrag(dragRef.current);
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!d) return;
      if (!d.moved) {
        // clique: na cartela escolhe o adesivo; no equipamento não faz nada
        if (!d.fromDevice) setPicked((p) => (p === d.type ? null : d.type));
        return;
      }
      if (!handlers.current.stickAt(d.type, e.clientX, e.clientY) && d.fromDevice) handlers.current.peel();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [dragging]);

  // adesivo escolhido com clique (ou teclado): o próximo clique na imagem cola
  const onStageClick = (e: ReactMouseEvent) => {
    if (picked) stickAt(picked, e.clientX, e.clientY);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    if (picked) setPicked(null);
    else onClose();
  };

  const ready = tag.mark !== null && tag.sticker !== null;
  const hint =
    msg ??
    (ready
      ? 'Pronto! Pode voltar e procurar o próximo equipamento.'
      : 'Leia o resumo: que tipo de computador é este? Marque o traço na prancheta e arraste o adesivo até ele.');

  return createPortal(
    <div className="office-desk-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={onKeyDown}>
      <div className="office-desk-card office-survey-card" ref={cardRef} tabIndex={-1}>
        <header className="office-desk-head">
          <strong id={titleId}>🔎 {device.name}</strong>
          <span className="office-desk-model">{device.where}</span>
        </header>
        <p className="office-survey-summary">{device.summary}</p>

        <div className="office-survey-body">
          <div className="office-survey-left">
            <div
              ref={stageRef}
              className={picked || (drag?.moved ?? false) ? 'office-survey-stage is-target' : 'office-survey-stage'}
              onClick={onStageClick}
              role="img"
              aria-label={`${device.name}${tag.sticker ? `, com adesivo de ${TYPE_INFO[tag.sticker].name}` : ', sem adesivo'}`}
            >
              <img src={IMAGES[device.image]} alt="" draggable={false} />
              {tag.sticker && !(drag?.fromDevice && drag.moved) && (
                <button
                  type="button"
                  className="office-survey-placed"
                  style={{ left: `${(tag.at?.x ?? 0.5) * 100}%`, top: `${(tag.at?.y ?? 0.5) * 100}%` }}
                  onPointerDown={(e) => begin(e, tag.sticker!, true)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Delete' || e.key === 'Backspace') peel();
                  }}
                  title="Arraste para mudar de lugar; solte fora para descolar"
                  aria-label={`Adesivo de ${TYPE_INFO[tag.sticker].name} colado (Delete descola)`}
                >
                  <Sticker type={tag.sticker} />
                </button>
              )}
            </div>
            <div className="office-survey-sheet">
              <span className="office-survey-sheet-title">Cartela de adesivos</span>
              <div className="office-survey-stickers">
                {COMPUTER_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={picked === t.id ? 'office-survey-pick is-picked' : 'office-survey-pick'}
                    aria-pressed={picked === t.id}
                    aria-label={`Adesivo ${t.name}`}
                    onPointerDown={(e) => begin(e, t.id, false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        // teclado: cola direto no meio do equipamento
                        const r = stageRef.current?.getBoundingClientRect();
                        if (r) stickAt(t.id, r.left + r.width / 2, r.top + r.height / 2);
                      }
                    }}
                  >
                    <Sticker type={t.id} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="office-clip-wrap">
            <div className="office-clip">
              <span className="office-clip-clamp" aria-hidden="true" />
              <div className="office-clip-paper">
                <strong className="office-clip-title">Levantamento de computadores</strong>
                <span className="office-clip-sub">Marque um traço | no tipo de cada equipamento</span>
                <table>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Quantidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPUTER_TYPES.map((t) => (
                      <tr key={t.id} className={tag.mark === t.id ? 'is-marked' : ''}>
                        <td>
                          <button type="button" className="office-clip-row" aria-pressed={tag.mark === t.id} onClick={() => mark(t.id)}>
                            <span className="office-clip-swatch" style={{ background: t.color }} aria-hidden="true" />
                            {t.name}
                          </button>
                        </td>
                        <td>
                          <Tally count={counts[t.id]} fresh={tag.mark === t.id} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <Hand side="left" />
            <Hand side="right" />
          </div>
        </div>

        <p className={ready ? 'office-desk-msg tone-ok' : 'office-desk-msg tone-info'} aria-live="polite">
          {hint}
        </p>
        <footer className="office-desk-actions">
          <button type="button" onClick={onClose}>
            Sair <kbd>Esc</kbd>
          </button>
          <button type="button" className="office-primary" disabled={!ready} onClick={onClose}>
            Pronto ✓
          </button>
        </footer>
      </div>
      {drag?.moved && (
        <div className="office-drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          <Sticker type={drag.type} />
        </div>
      )}
    </div>,
    document.body,
  );
}
