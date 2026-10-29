import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import cooler from '../assets/pecas/cooler.png';
import cpuAm4 from '../assets/pecas/cpu-am4.png';
import cpuLga from '../assets/pecas/cpu-lga.png';
import etiquetas from '../assets/pecas/etiquetas.json';
import fonte from '../assets/pecas/fonte.png';
import gpu1 from '../assets/pecas/gpu-1.png';
import gpu2 from '../assets/pecas/gpu-2.png';
import hd25 from '../assets/pecas/hd-25.png';
import hd35 from '../assets/pecas/hd-35.png';
import mbMatx from '../assets/pecas/mb-matx.png';
import ramDdr3 from '../assets/pecas/ram-ddr3.png';
import ramDdr4 from '../assets/pecas/ram-ddr4.png';
import ramSodimm from '../assets/pecas/ram-sodimm.png';
import ssdM2 from '../assets/pecas/ssd-m2.png';
import ssdSata from '../assets/pecas/ssd-sata.png';
import { KINDS, PART_KINDS, partById, TARGET, type Bag, type Part, type PartArt, type PartKind } from './pecas';

export const PART_IMAGES: Record<PartArt, string> = {
  'hd-35': hd35,
  'hd-25': hd25,
  'ssd-sata': ssdSata,
  'ssd-m2': ssdM2,
  'mb-matx': mbMatx,
  'ram-ddr4': ramDdr4,
  'ram-ddr3': ramDdr3,
  'ram-sodimm': ramSodimm,
  'cpu-am4': cpuAm4,
  'cpu-lga': cpuLga,
  cooler,
  fonte,
  'gpu-2': gpu2,
  'gpu-1': gpu1,
};

const LABELS = etiquetas.labels as Record<PartArt, [number, number, number, number]>;
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/** O desenho da peça com o adesivo; `sticker` = escreve as referências no adesivo (na lista, fica em branco). */
export function PartPicture({ part, sticker = true, className }: { part: Part; sticker?: boolean; className?: string }) {
  const [x, y, w, h] = LABELS[part.art];
  return (
    <span className={`office-peca-art ${className ?? ''}`.trim()}>
      <img src={PART_IMAGES[part.art]} alt="" draggable={false} />
      {sticker && (
        <span
          className="office-peca-sticker"
          style={{ left: pct(x, etiquetas.w), top: pct(y, etiquetas.h), width: pct(w, etiquetas.w), height: pct(h, etiquetas.h) }}
        >
          <strong>{part.brand}</strong>
          <span>{part.type}</span>
          <span>{part.spec}</span>
        </span>
      )}
    </span>
  );
}

const SKIN = '#f2c29b';
const SKIN_D = '#d89a72';
const OUT = '#1c1626';

/** Mão do ESTAGIÁRIO por baixo da peça: palma e manga verde atrás, dedão na frente (pixel art). */
function HandUnder() {
  return (
    <svg className="office-peca-hand" viewBox="0 0 40 18" shapeRendering="crispEdges" aria-hidden="true">
      <rect x={4} y={0} width={30} height={10} fill={OUT} />
      <rect x={5} y={1} width={28} height={8} fill={SKIN} />
      <rect x={5} y={7} width={28} height={2} fill={SKIN_D} />
      <rect x={12} y={9} width={16} height={9} fill={OUT} />
      <rect x={13} y={9} width={14} height={9} fill="#5f9e2f" />
      <rect x={13} y={9} width={3} height={9} fill="#447a1f" />
    </svg>
  );
}
function Thumb() {
  return (
    <svg className="office-peca-thumb" viewBox="0 0 10 8" shapeRendering="crispEdges" aria-hidden="true">
      <rect x={0} y={0} width={10} height={8} fill={OUT} />
      <rect x={1} y={1} width={8} height={6} fill={SKIN} />
      <rect x={1} y={5} width={8} height={2} fill={SKIN_D} />
      <rect x={6} y={2} width={2} height={2} fill="#f8dcc4" />
    </svg>
  );
}

/** Pontas dos dedos aparecendo na frente da borda de baixo da peça. */
function Fingers() {
  return (
    <svg className="office-peca-fingers" viewBox="0 0 16 6" shapeRendering="crispEdges" aria-hidden="true">
      {[0, 5, 10].map((x) => (
        <g key={x}>
          <rect x={x} y={0} width={6} height={6} fill={OUT} />
          <rect x={x + 1} y={1} width={4} height={4} fill={SKIN} />
          <rect x={x + 1} y={4} width={4} height={1} fill={SKIN_D} />
        </g>
      ))}
    </svg>
  );
}

/** A lista do Marcos na prancheta: desenho, nome e referências de cada peça, e o que já está na mochila. */
export function ListaPecas({ bag, delivered }: { bag: Bag; delivered: ReadonlySet<PartKind> }) {
  return (
    <section className="office-lista" aria-label="Lista de peças do Marcos">
      <span className="office-lista-clip" aria-hidden="true" />
      <h3>📋 Lista do Marcos · {PART_KINDS.length} peças</h3>
      <ol>
        {PART_KINDS.map((k) => {
          const want = TARGET[k];
          const inBag = bag[k] ? partById(bag[k]!) : undefined;
          return (
            <li key={k} className={delivered.has(k) ? 'is-delivered' : inBag ? 'is-bag' : undefined}>
              <PartPicture part={want} sticker={false} className="is-thumb" />
              <span className="office-lista-text">
                <strong>{KINDS[k].name}</strong>
                <span>
                  {want.brand} · {want.type} · {want.spec}
                </span>
                {delivered.has(k) ? (
                  <em>✓ entregue ao Marcos</em>
                ) : inBag ? (
                  <em>
                    🧰 na mochila: {inBag.brand} · {inBag.type} · {inBag.spec}
                  </em>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export interface PecaNaMaoProps {
  /** Peça que o ESTAGIÁRIO pegou do chão; `null` = só olhando a lista. */
  part: Part | null;
  bag: Bag;
  delivered: ReadonlySet<PartKind>;
  /** Guardar (ou trocar pela do mesmo tipo que está na mochila). */
  onStore: () => void;
  /** Deixar no chão (ou fechar a lista). */
  onLeave: () => void;
}

/** A peça na mão do ESTAGIÁRIO, com o adesivo para ler, ao lado da lista do Marcos: guardar ou deixar. */
export default function PecaNaMao({ part, bag, delivered, onStore, onLeave }: PecaNaMaoProps) {
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => cardRef.current?.focus(), []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    onLeave();
  };

  const kind = part?.kind;
  const done = !!kind && delivered.has(kind);
  const swap = !!kind && !done && !!bag[kind];

  return createPortal(
    <div className="office-peca-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={onKeyDown}>
      <div className={part ? 'office-peca-card' : 'office-peca-card is-list-only'} ref={cardRef} tabIndex={-1}>
        {part && (
          <section className="office-peca-hold">
            <p className="office-peca-kicker" id={titleId}>
              Peça na mão: leia o adesivo e compare com a lista
            </p>
            <div className="office-peca-stage">
              <HandUnder />
              <PartPicture part={part} />
              <Thumb />
              <Fingers />
            </div>
            <div className="office-peca-actions">
              {done ? (
                <p className="office-peca-note">O Marcos já recebeu esta peça da lista ({KINDS[kind].name}): esta pode ficar aqui.</p>
              ) : (
                <button type="button" className="office-primary" onClick={onStore}>
                  {swap ? '⇄ Guardar e deixar a da mochila' : '🧰 Guardar na mochila'}
                </button>
              )}
              <button type="button" onClick={onLeave}>
                ✕ Deixar aqui
              </button>
            </div>
          </section>
        )}
        {!part && (
          <header className="office-peca-listhead">
            <h2 id={titleId}>Lista de peças</h2>
            <button type="button" className="office-primary" onClick={onLeave}>
              Fechar
            </button>
          </header>
        )}
        <ListaPecas bag={bag} delivered={delivered} />
      </div>
    </div>,
    document.body,
  );
}
