import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getGame, type GameResult } from '@playground/games';
import type { ExerciseCheck } from './exercicio';
import { clockAt } from './forca';
import { MISSAO_EXERCICIO, type MissionGame } from './missoes';
import { useFullscreen } from './useFullscreen';

export interface CelularOverlayProps {
  /** Quiz da biblioteca que abre pelo link da mensagem. */
  game: MissionGame;
  /** Tentativas já enviadas (cada uma vira uma mensagem do ESTAGIÁRIO e a resposta do amigo). */
  attempts: ExerciseCheck[];
  /** Primeira vez que abre: as mensagens do amigo chegam uma a uma, com "digitando…". */
  intro: boolean;
  /** Terminou o quiz e enviou as respostas. */
  onAttempt: (result: GameResult) => void;
  /** Guardou o celular. */
  onClose: () => void;
}

const SKIN = '#f2c29b';
const SKIN_D = '#d89a72';
const SLEEVE = '#5f9e2f';
const SLEEVE_D = '#447a1f';
const OUT = '#1c1626';
/** Hora da k-ésima resposta do ESTAGIÁRIO na conversa. */
const sentAt = (k: number) => clockAt(MISSAO_EXERCICIO.at + 3 + k * 4, 0, 0);
const TYPING_MS = 900;

/** Palma e manga da mão esquerda do ESTAGIÁRIO, por trás do celular (pixel art). */
function HandBack() {
  return (
    <svg className="office-phone-hand-back" viewBox="0 0 30 34" shapeRendering="crispEdges" aria-hidden="true">
      <rect x={0} y={19} width={15} height={15} fill={OUT} />
      <rect x={1} y={20} width={13} height={14} fill={SLEEVE} />
      <rect x={1} y={20} width={3} height={14} fill={SLEEVE_D} />
      <rect x={7} y={5} width={21} height={19} fill={OUT} />
      <rect x={8} y={6} width={19} height={17} fill={SKIN} />
      <rect x={8} y={20} width={19} height={3} fill={SKIN_D} />
    </svg>
  );
}

/** Dedão da mão esquerda, subindo da palma e dobrado por cima da borda do celular. */
function Thumb() {
  return (
    <svg className="office-phone-thumb" viewBox="0 0 8 12" shapeRendering="crispEdges" aria-hidden="true">
      <rect x={2} y={0} width={6} height={6} fill={OUT} />
      <rect x={0} y={4} width={7} height={8} fill={OUT} />
      <rect x={3} y={1} width={4} height={4} fill={SKIN} />
      <rect x={1} y={5} width={5} height={7} fill={SKIN} />
      <rect x={1} y={9} width={5} height={3} fill={SKIN_D} />
      <rect x={4} y={1} width={2} height={2} fill="#f8dcc4" />
    </svg>
  );
}

/** Pontas dos dedos aparecendo do outro lado do celular. */
function Fingers() {
  return (
    <svg className="office-phone-fingers" viewBox="0 0 6 20" shapeRendering="crispEdges" aria-hidden="true">
      {[0, 7, 14].map((y) => (
        <g key={y}>
          <rect x={0} y={y} width={6} height={6} fill={OUT} />
          <rect x={0} y={y + 1} width={5} height={4} fill={SKIN} />
          <rect x={0} y={y + 4} width={5} height={1} fill={SKIN_D} />
        </g>
      ))}
    </svg>
  );
}

function Typing() {
  return (
    <div className="office-chat-bubble is-in is-typing" aria-label="digitando">
      <span />
      <span />
      <span />
    </div>
  );
}

/**
 * O celular do ESTAGIÁRIO na mão dele, aberto na conversa do WhatsApp com o amigo do curso. O link da mensagem abre
 * o quiz da biblioteca na tela do celular; ao enviar, a conversa ganha a resposta dele e a do amigo.
 */
export default function CelularOverlay({ game, attempts, intro, onAttempt, onClose }: CelularOverlayProps) {
  const module = getGame('QUIZ');
  const config = useMemo(() => module.validateConfig(game.config), [module, game.config]);
  const base = MISSAO_EXERCICIO.chat.length + 1; // mensagens + o link
  const [shown, setShown] = useState(intro ? 0 : base);
  const [replied, setReplied] = useState(attempts.length);
  const [view, setView] = useState<'chat' | 'quiz'>('chat');
  const [result, setResult] = useState<GameResult | null>(null);
  const [round, setRound] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { fullscreen, toggle, exit } = useFullscreen(modalRef);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  // o amigo "digitando" cada mensagem
  useEffect(() => {
    if (shown >= base) return;
    const id = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 500 : TYPING_MS);
    return () => window.clearTimeout(id);
  }, [shown, base]);

  // resposta do amigo a uma tentativa nova
  useEffect(() => {
    if (replied >= attempts.length) return;
    const id = window.setTimeout(() => setReplied(attempts.length), TYPING_MS + 300);
    return () => window.clearTimeout(id);
  }, [replied, attempts.length]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown, replied, attempts.length, view]);

  const close = () => {
    exit();
    onClose();
  };

  const openLink = () => {
    setResult(null);
    setRound((r) => r + 1);
    setView('quiz');
  };

  const send = () => {
    if (!result) return;
    onAttempt(result);
    setView('chat');
  };

  const last = attempts[attempts.length - 1];
  const done = !!last?.passed && replied >= attempts.length;
  const typing = shown < base || replied < attempts.length;
  const at = clockAt(MISSAO_EXERCICIO.at, 0, 0);
  const now = attempts.length ? sentAt(attempts.length - 1) : at;

  return createPortal(
    <div
      ref={modalRef}
      className={fullscreen ? 'office-phone-modal is-fullscreen' : 'office-phone-modal'}
      role="dialog"
      aria-modal="true"
      aria-label={`Celular: conversa com ${MISSAO_EXERCICIO.friend}`}
    >
      <div className="office-phone-actions">
        <button type="button" className="office-tablet-btn" onClick={toggle} aria-pressed={fullscreen}>
          {fullscreen ? '🗗 Sair da tela cheia' : '⛶ Tela cheia'}
        </button>
        {!done && (
          <button type="button" className="office-tablet-btn" onClick={close}>
            ✕ Guardar o celular
          </button>
        )}
      </div>
      <div className="office-phone">
        <HandBack />
        <div className="office-phone-frame">
          <div className="office-phone-body">
            <span className="office-phone-speaker" aria-hidden="true" />
            <div className="office-phone-screen">
              <header className="office-phone-status">
                <span className="office-tablet-clock">{now}</span>
                <span className="office-spacer" />
                <span aria-hidden="true">📶 🔋</span>
              </header>
              {view === 'chat' ? (
                <>
                  <header className="office-chat-head">
                    <span className="office-chat-avatar" aria-hidden="true">
                      {MISSAO_EXERCICIO.friendInitials}
                    </span>
                    <span className="office-chat-who">
                      <strong>{MISSAO_EXERCICIO.friend}</strong>
                      <small>{typing ? 'digitando…' : 'online'}</small>
                    </span>
                  </header>
                  <div className="office-chat-list" ref={listRef} aria-live="polite">
                    <p className="office-chat-day">HOJE</p>
                    {MISSAO_EXERCICIO.chat.slice(0, shown).map((text) => (
                      <div key={text} className="office-chat-bubble is-in">
                        {text}
                        <time>{at}</time>
                      </div>
                    ))}
                    {shown >= base && (
                      <div className="office-chat-bubble is-in is-link">
                        <button type="button" className="office-chat-link" onClick={openLink} disabled={done}>
                          <span className="office-chat-link-icon" aria-hidden="true">
                            📝
                          </span>
                          <span>
                            <strong>{MISSAO_EXERCICIO.link.title}</strong>
                            <small>{MISSAO_EXERCICIO.link.site}</small>
                          </span>
                        </button>
                        <span className="office-chat-url">
                          https://{MISSAO_EXERCICIO.link.site}
                          {!done && <em> · {MISSAO_EXERCICIO.link.cta}</em>}
                        </span>
                        <time>{at}</time>
                      </div>
                    )}
                    {attempts.map((a, k) => (
                      <div key={k} className="office-chat-pair">
                        <div className="office-chat-bubble is-out">
                          {MISSAO_EXERCICIO.sent(a.right, a.total)}
                          <time>
                            {sentAt(k)} <span className="office-chat-ticks">✓✓</span>
                          </time>
                        </div>
                        {k < replied && (
                          <div className="office-chat-bubble is-in">
                            {a.passed ? MISSAO_EXERCICIO.passed : MISSAO_EXERCICIO.failed(a.needed, a.total)}
                            <time>{sentAt(k)}</time>
                          </div>
                        )}
                      </div>
                    ))}
                    {typing && <Typing />}
                  </div>
                  <footer className="office-chat-foot">
                    {done ? (
                      <button type="button" className="office-tablet-btn office-primary" autoFocus onClick={close}>
                        Guardar o celular ✓
                      </button>
                    ) : (
                      <span className="office-chat-input" aria-hidden="true">
                        Mensagem
                      </span>
                    )}
                  </footer>
                </>
              ) : (
                <>
                  <header className="office-chat-head is-site">
                    <button type="button" className="office-chat-back" onClick={() => setView('chat')} title="Voltar para a conversa">
                      ←
                    </button>
                    <span className="office-chat-who">
                      <strong>{MISSAO_EXERCICIO.link.title}</strong>
                      <small>🔒 {MISSAO_EXERCICIO.link.site}</small>
                    </span>
                  </header>
                  <div className="office-phone-content">
                    {config ? (
                      <module.Player key={round} config={config} allowRestart={false} onComplete={setResult} />
                    ) : (
                      <p>Este quiz está com a configuração inválida. Escolha outro na biblioteca.</p>
                    )}
                  </div>
                  {result && (
                    <footer className="office-chat-foot">
                      <button type="button" className="office-tablet-btn office-primary" autoFocus onClick={send}>
                        Enviar respostas ▶
                      </button>
                    </footer>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <Thumb />
        <Fingers />
      </div>
    </div>,
    document.body,
  );
}
