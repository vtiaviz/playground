import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getGame, type GameResult } from '@playground/games';
import type { MissionGame } from './missoes';
import { useFullscreen } from './useFullscreen';

export interface MinigameOverlayProps {
  heading: string;
  game: MissionGame;
  /** Saiu depois de terminar o jogo (`result`) ou desistiu (`null`). */
  onClose: (result: GameResult | null) => void;
}

const clock = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/**
 * "Tela de jogo": um modal com o monitor do PC do chefe e o jogo de palavras-cruzadas rodando numa
 * janela da área de trabalho, como se o ESTAGIÁRIO estivesse usando o computador dele.
 */
export default function MinigameOverlay({ heading, game: missionGame, onClose }: MinigameOverlayProps) {
  const game = getGame('CRUZADAS');
  const config = useMemo(() => game.validateConfig(missionGame.config), [game, missionGame.config]);
  const [result, setResult] = useState<GameResult | null>(null);
  const [time, setTime] = useState(clock);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => setTime(clock()), 15_000);
    // a página de trás não rola enquanto o modal está aberto
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearInterval(id);
      document.body.style.overflow = overflow;
    };
  }, []);

  const { fullscreen, toggle: toggleFullscreen, exit: exitFullscreen } = useFullscreen(modalRef);

  const close = (r: GameResult | null) => {
    exitFullscreen();
    onClose(r);
  };

  return createPortal(
    <div
      ref={modalRef}
      className={fullscreen ? 'office-pc-modal is-fullscreen' : 'office-pc-modal'}
      role="dialog"
      aria-modal="true"
      aria-label={`${heading}: ${missionGame.title}`}
    >
      <div className="office-pc">
        <div className="office-pc-bezel">
          <div className="office-pc-screen">
            <div className="office-pc-desktop">
              <div className="office-pc-window">
                <div className="office-pc-titlebar">
                  <span className="office-pc-appicon" aria-hidden="true">
                    ✏️
                  </span>
                  <strong>{missionGame.title}</strong>
                  <span className="office-pc-subtitle">· {heading}</span>
                  <span className="office-spacer" />
                  <button
                    type="button"
                    className="office-pc-winbtn"
                    onClick={toggleFullscreen}
                    title={fullscreen ? 'Sair da tela cheia (Esc)' : 'Tela cheia'}
                    aria-pressed={fullscreen}
                  >
                    {fullscreen ? '🗗' : '⛶'}
                    <span className="office-pc-winbtn-label">{fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}</span>
                  </button>
                  {result ? (
                    <button type="button" className="office-pc-winbtn office-primary" autoFocus onClick={() => close(result)}>
                      Voltar ao escritório ▶
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="office-pc-winbtn office-pc-close"
                      onClick={() => close(null)}
                      title="Desistir e voltar ao escritório"
                    >
                      ✕<span className="office-pc-winbtn-label">Desistir</span>
                    </button>
                  )}
                </div>
                <div className="office-pc-content">
                  {config ? (
                    <game.Player config={config} allowRestart={false} onComplete={setResult} />
                  ) : (
                    <p>Este jogo de palavras-cruzadas está com a configuração inválida. Escolha outro na biblioteca.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="office-pc-taskbar" aria-hidden="true">
              <span className="office-pc-start">⊞</span>
              <span className="office-pc-task is-active">✏️ Palavras-cruzadas</span>
              <span className="office-pc-task">📁 Documentos</span>
              <span className="office-spacer" />
              <span>🔊 📶</span>
              <span>{time}</span>
            </div>
          </div>
          <div className="office-pc-brand" aria-hidden="true">
            <span>PC do Chefe</span>
            <span className="office-pc-led" />
          </div>
        </div>
        <div className="office-pc-neck" aria-hidden="true" />
        <div className="office-pc-base" aria-hidden="true" />
      </div>
    </div>,
    document.body,
  );
}
