import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getGame, type GameResult } from '@playground/games';
import type { MissionGame } from './missoes';
import { useFullscreen } from './useFullscreen';

export interface PapelOverlayProps {
  heading: string;
  game: MissionGame;
  /** Jogo da biblioteca escrito na folha: as frases (missão 3) ou o quiz (missão 4). */
  gameType?: 'COMPLETE_FRASES' | 'QUIZ';
  /** Linha pequena em cima do título. */
  kicker?: string;
  /** Saiu depois de terminar o jogo (`result`) ou antes (`null`, continua depois). */
  onClose: (result: GameResult | null) => void;
}

/**
 * Modal em forma de folha de papel pautado (com clipe, margem vermelha e mancha de café), com um jogo da biblioteca
 * escrito na folha: o "Complete as Frases" (fase 4, missão 3) ou o quiz (missão 4) do treinamento de TI.
 */
export default function PapelOverlay({
  heading,
  game,
  gameType = 'COMPLETE_FRASES',
  kicker = 'Treinamento de TI · rascunho do Marcos',
  onClose,
}: PapelOverlayProps) {
  const module = getGame(gameType);
  const config = useMemo(() => module.validateConfig(game.config), [module, game.config]);
  const [result, setResult] = useState<GameResult | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const { fullscreen, toggle, exit } = useFullscreen(modalRef);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  const close = (r: GameResult | null) => {
    exit();
    onClose(r);
  };

  return createPortal(
    <div
      ref={modalRef}
      className={fullscreen ? 'office-paper-modal is-fullscreen' : 'office-paper-modal'}
      role="dialog"
      aria-modal="true"
      aria-label={`${heading}: ${game.title}`}
    >
      <div className="office-paper">
        <span className="office-paper-clip" aria-hidden="true" />
        <span className="office-paper-stain" aria-hidden="true" />
        <header className="office-paper-top">
          <span className="office-paper-kicker">{kicker}</span>
          <strong className="office-paper-title">{game.title}</strong>
          <span className="office-paper-sub">{heading}</span>
          <span className="office-paper-actions">
            <button type="button" className="office-board-btn" onClick={toggle} aria-pressed={fullscreen}>
              {fullscreen ? '🗗 Sair da tela cheia' : '⛶ Tela cheia'}
            </button>
            {result ? (
              <button type="button" className="office-board-btn office-primary" autoFocus onClick={() => close(result)}>
                Pronto ▶
              </button>
            ) : (
              <button
                type="button"
                className="office-board-btn"
                onClick={() => close(null)}
                title="Deixar o papel na mesa e continuar depois"
              >
                ✕ Fechar (continua depois)
              </button>
            )}
          </span>
        </header>
        <div className="office-paper-content">
          {config ? (
            <module.Player config={config} allowRestart={false} onComplete={setResult} />
          ) : (
            <p>Este jogo está com a configuração inválida. Escolha outro na biblioteca.</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
