import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getGame, type GameResult } from '@playground/games';
import type { MissionGame } from './missoes';
import { useFullscreen } from './useFullscreen';

export interface TabletOverlayProps {
  heading: string;
  game: MissionGame;
  /** Jogo da biblioteca na tela: o quiz da Elisa (padrão, fase 1) ou a forca do Marcos (fase 2, missão 4). */
  gameType?: 'QUIZ' | 'FORCA';
  /** Quem segura o tablet (cor da manga): a Elisa (vermelha) ou o ESTAGIÁRIO (verde). */
  holder?: 'elisa' | 'estagiario';
  /** Texto do botão depois de terminar o jogo. */
  doneLabel?: string;
  /** Saiu depois de terminar o jogo (`result`) ou desistiu (`null`). */
  onClose: (result: GameResult | null) => void;
}

const SKIN = '#f2c29b';
const SKIN_D = '#d89a72';
const SLEEVES = { elisa: ['#b03a3a', '#822828'], estagiario: ['#5f9e2f', '#447a1f'] } as const;
const OUT = '#1c1626';

const APPS = {
  QUIZ: { icon: '📝', invalid: 'Este quiz está com a configuração inválida.' },
  FORCA: { icon: '🎯', invalid: 'Esta forca está com a configuração inválida.' },
} as const;

/** Mão segurando a borda do tablet (pixel art). A da direita é espelhada. */
function Hand({ side, holder }: { side: 'left' | 'right'; holder: 'elisa' | 'estagiario' }) {
  const [SLEEVE, SLEEVE_D] = SLEEVES[holder];
  return (
    <svg
      className={`office-tablet-hand is-${side}`}
      viewBox="0 0 16 26"
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={side === 'right' ? { transform: 'scaleX(-1)' } : undefined}
    >
      {/* manga */}
      <rect x={0} y={14} width={9} height={12} fill={OUT} />
      <rect x={1} y={15} width={7} height={11} fill={SLEEVE} />
      <rect x={1} y={15} width={2} height={11} fill={SLEEVE_D} />
      {/* palma por trás do tablet e dedão na frente da borda */}
      <rect x={3} y={4} width={9} height={12} fill={OUT} />
      <rect x={4} y={5} width={7} height={10} fill={SKIN} />
      <rect x={4} y={13} width={7} height={2} fill={SKIN_D} />
      <rect x={10} y={6} width={6} height={5} fill={OUT} />
      <rect x={11} y={7} width={4} height={3} fill={SKIN} />
      <rect x={11} y={9} width={4} height={1} fill={SKIN_D} />
    </svg>
  );
}

/** Hora do relógio da barra de status do tablet. */
const clock = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/**
 * Modal em forma de tablet (pixel art: moldura grossa, câmera, botão de início e as mãos de quem segura), com um
 * jogo da biblioteca na tela: o quiz da "prova de informática" da Elisa ou a forca do tablet do Marcos.
 */
export default function TabletOverlay({
  heading,
  game,
  gameType = 'QUIZ',
  holder = 'elisa',
  doneLabel = 'Devolver o tablet',
  onClose,
}: TabletOverlayProps) {
  const module = getGame(gameType);
  const app = APPS[gameType];
  const config = useMemo(() => module.validateConfig(game.config), [module, game.config]);
  const [result, setResult] = useState<GameResult | null>(null);
  const [time, setTime] = useState(clock);
  const modalRef = useRef<HTMLDivElement>(null);
  const { fullscreen, toggle, exit } = useFullscreen(modalRef);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const id = window.setInterval(() => setTime(clock()), 15000);
    return () => {
      document.body.style.overflow = overflow;
      window.clearInterval(id);
    };
  }, []);

  const close = (r: GameResult | null) => {
    exit();
    onClose(r);
  };

  return createPortal(
    <div
      ref={modalRef}
      className={fullscreen ? 'office-tablet-modal is-fullscreen' : 'office-tablet-modal'}
      role="dialog"
      aria-modal="true"
      aria-label={`${heading}: ${game.title}`}
    >
      <div className="office-tablet">
        <Hand side="left" holder={holder} />
        <Hand side="right" holder={holder} />
        <div className="office-tablet-frame">
          <div className="office-tablet-body">
            <span className="office-tablet-camera" aria-hidden="true" />
            <div className="office-tablet-screen">
              <header className="office-tablet-status">
                <span className="office-tablet-clock">{time}</span>
                <strong className="office-tablet-app">
                  {app.icon} {heading}
                </strong>
                <span className="office-spacer" />
                <button type="button" className="office-tablet-btn" onClick={toggle} aria-pressed={fullscreen}>
                  {fullscreen ? '🗗 Sair da tela cheia' : '⛶ Tela cheia'}
                </button>
                {result ? (
                  <button type="button" className="office-tablet-btn office-primary" autoFocus onClick={() => close(result)}>
                    {doneLabel} ▶
                  </button>
                ) : (
                  <button
                    type="button"
                    className="office-tablet-btn"
                    onClick={() => close(null)}
                    title="Desistir"
                  >
                    ✕ Desistir
                  </button>
                )}
                <span className="office-tablet-icons" aria-hidden="true">
                  📶 🔋
                </span>
              </header>
              <div className="office-tablet-content">
                {config ? (
                  <module.Player config={config} allowRestart={false} onComplete={setResult} />
                ) : (
                  <p>{app.invalid} Escolha outro na biblioteca.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
