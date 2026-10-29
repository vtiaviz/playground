import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getGame, type GameResult } from '@playground/games';
import type { MissionGame } from './missoes';
import { useFullscreen } from './useFullscreen';

export interface SonhoOverlayProps {
  heading: string;
  game: MissionGame;
  /** Acordou depois de terminar o jogo (`result`) ou antes (`null`, desistiu). */
  onClose: (result: GameResult | null) => void;
}

/** Quanto dura o "acordar" (a imagem tremendo e sumindo) antes de voltar ao escritório. */
const WAKE_MS = 900;

/**
 * O sonho acordado (fase 3, missão 5): a imagem entra tremendo e embaçada, como num sonho, e mostra o
 * caça-palavras da biblioteca numa nuvem. Ao acordar, treme de novo e some.
 */
export default function SonhoOverlay({ heading, game, onClose }: SonhoOverlayProps) {
  const module = getGame('CACA_PALAVRAS');
  const config = useMemo(() => module.validateConfig(game.config), [module, game.config]);
  const [result, setResult] = useState<GameResult | null>(null);
  const [waking, setWaking] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const { fullscreen, toggle, exit } = useFullscreen(modalRef);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  const wake = (r: GameResult | null) => {
    if (waking) return;
    exit();
    setWaking(true);
    window.setTimeout(() => onClose(r), WAKE_MS);
  };

  const cls = ['office-dream-modal', fullscreen && 'is-fullscreen', waking && 'is-waking'].filter(Boolean).join(' ');
  return createPortal(
    <div ref={modalRef} className={cls} role="dialog" aria-modal="true" aria-label={`${heading}: ${game.title}`}>
      <div className="office-dream-wrap">
        <span className="office-dream-glow" aria-hidden="true" />
        <div className="office-dream">
          <header className="office-dream-top">
            <span className="office-dream-icon" aria-hidden="true">
              💭
            </span>
            <strong className="office-dream-title">{game.title}</strong>
            <span className="office-dream-sub">{heading}</span>
            <span className="office-spacer" />
            <button type="button" className="office-dream-btn" onClick={toggle} aria-pressed={fullscreen}>
              {fullscreen ? '🗗 Sair da tela cheia' : '⛶ Tela cheia'}
            </button>
            {result ? (
              <button type="button" className="office-dream-btn office-primary" autoFocus onClick={() => wake(result)}>
                Acordar ▶
              </button>
            ) : (
              <button
                type="button"
                className="office-dream-btn"
                onClick={() => wake(null)}
                title="Acordar sem terminar (não tem outra chance)"
              >
                ✕ Desistir
              </button>
            )}
          </header>
          <div className="office-dream-content">
            {config ? (
              <module.Player config={config} allowRestart={false} onComplete={setResult} />
            ) : (
              <p>Este jogo está com a configuração inválida. Escolha outro na biblioteca.</p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
