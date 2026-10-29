import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import arduinoMega from '../assets/placas/arduino-mega.png';
import arduinoNano from '../assets/placas/arduino-nano.png';
import arduinoUno from '../assets/placas/arduino-uno.png';
import raspberryPi4 from '../assets/placas/raspberry-pi-4.png';
import raspberryPiPico from '../assets/placas/raspberry-pi-pico.png';
import raspberryPiZero from '../assets/placas/raspberry-pi-zero.png';
import { BOARD_TOTAL, BOARDS, type BoardModel } from './placas';

export const BOARD_IMAGES: Record<BoardModel, string> = {
  'arduino-uno': arduinoUno,
  'arduino-nano': arduinoNano,
  'arduino-mega': arduinoMega,
  'raspberry-pi-4': raspberryPi4,
  'raspberry-pi-zero': raspberryPiZero,
  'raspberry-pi-pico': raspberryPiPico,
};

/** Quanto tempo a placa fica em destaque antes de ir para a mochila (dá para fechar antes). */
const SHOW_MS = 5500;

export interface PlacaDestaqueProps {
  model: BoardModel;
  /** Quantas placas o ESTAGIÁRIO tem contando com esta. */
  count: number;
  onDone: () => void;
}

/** A placa que o ESTAGIÁRIO acabou de pegar, grande, com o nome e o que ela é; some sozinha e conta mais uma. */
export default function PlacaDestaque({ model, count, onDone }: PlacaDestaqueProps) {
  const info = BOARDS[model];
  const titleId = useId();
  const [leaving, setLeaving] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  const close = () => setLeaving(true);

  useEffect(() => {
    cardRef.current?.focus();
    const id = window.setTimeout(close, SHOW_MS);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const id = window.setTimeout(() => done.current(), 280);
    return () => window.clearTimeout(id);
  }, [leaving]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' && e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    e.stopPropagation();
    close();
  };

  return createPortal(
    <div className={leaving ? 'office-placa-modal is-leaving' : 'office-placa-modal'} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={close} onKeyDown={onKeyDown}>
      <div className={`office-placa-card is-${info.family}`} ref={cardRef} tabIndex={-1}>
        <p className="office-placa-found">Você achou uma placa!</p>
        <div className="office-placa-stage">
          <img src={BOARD_IMAGES[model]} alt={info.name} />
        </div>
        <h3 id={titleId} className="office-placa-name">
          {info.name}
        </h3>
        <span className="office-placa-kind">{info.kind}</span>
        <p className="office-placa-what">{info.what}</p>
        <footer className="office-placa-foot">
          <span className="office-placa-count" aria-label={`${count} de ${BOARD_TOTAL} placas`}>
            🔌 {count}|{BOARD_TOTAL}
          </span>
          <button type="button" className="office-placa-ok" onClick={close}>
            Guardar ✓
          </button>
        </footer>
        <span className="office-placa-timer" style={{ animationDuration: `${SHOW_MS}ms` }} aria-hidden="true" />
      </div>
    </div>,
    document.body,
  );
}
