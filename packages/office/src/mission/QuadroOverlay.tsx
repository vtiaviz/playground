import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getGame, type GameResult } from '@playground/games';
import type { MissionGame } from './missoes';
import { useFullscreen } from './useFullscreen';

export interface QuadroOverlayProps {
  heading: string;
  game: MissionGame;
  /** Jogo da biblioteca no quadro: as frases da missão 4 ou o caça-palavras da fase 2 (missão 2). */
  gameType?: 'COMPLETE_FRASES' | 'CACA_PALAVRAS';
  /** Saiu depois de terminar o jogo (`result`) ou desistiu (`null`). */
  onClose: (result: GameResult | null) => void;
}

/**
 * Modal em forma de quadro branco da sala de reuniões (moldura de alumínio, ímãs e bandeja de canetas),
 * com um jogo da biblioteca escrito no quadro: o "Complete as Frases" (missão 4) ou o caça-palavras (fase 2).
 */
export default function QuadroOverlay({ heading, game, gameType = 'COMPLETE_FRASES', onClose }: QuadroOverlayProps) {
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
      className={fullscreen ? 'office-board-modal is-fullscreen' : 'office-board-modal'}
      role="dialog"
      aria-modal="true"
      aria-label={`${heading}: ${game.title}`}
    >
      <div className="office-board">
        {['tl', 'tr', 'bl', 'br'].map((k) => (
          <span key={k} className={`office-board-magnet is-${k}`} aria-hidden="true" />
        ))}
        <header className="office-board-top">
          <strong className="office-board-title">{game.title}</strong>
          <span className="office-board-sub">{heading}</span>
          <span className="office-spacer" />
          <button type="button" className="office-board-btn" onClick={toggle} aria-pressed={fullscreen}>
            {fullscreen ? '🗗 Sair da tela cheia' : '⛶ Tela cheia'}
          </button>
          {result ? (
            <button type="button" className="office-board-btn office-primary" autoFocus onClick={() => close(result)}>
              Voltar para a reunião ▶
            </button>
          ) : (
            <button type="button" className="office-board-btn" onClick={() => close(null)} title="Desistir e voltar ao escritório">
              ✕ Desistir
            </button>
          )}
        </header>
        <div className="office-board-content">
          {config ? (
            <module.Player config={config} allowRestart={false} onComplete={setResult} />
          ) : (
            <p>Este jogo está com a configuração inválida. Escolha outro na biblioteca.</p>
          )}
        </div>
      </div>
      <div className="office-board-tray" aria-hidden="true">
        <span className="office-board-pen is-blue" />
        <span className="office-board-pen is-red" />
        <span className="office-board-pen is-green" />
        <span className="office-board-pen is-black" />
        <span className="office-board-eraser" />
      </div>
    </div>,
    document.body,
  );
}
