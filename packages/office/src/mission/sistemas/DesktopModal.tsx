import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ACTION_FEEDBACK, afterAction, OS_NAMES, SHUTDOWN_HOW, type OfficePc, type PowerAction, type PowerState } from '../desligar';
import { useFullscreen } from '../useFullscreen';
import { DESKTOPS, LoginScreen, StatusScreen } from './Desktops';
import './sistemas.css';

/** Tamanho em que as telas dos sistemas são desenhadas (o monitor escala para caber). */
const SCREEN = { w: 960, h: 600 };
const SHUT_MS = 2400;
const BOOT_MS = 1800;

type Screen = 'desktop' | 'login' | 'sleep' | 'shutting' | 'restarting' | 'booting' | 'off';

const screenOf = (s: PowerState): Screen => (s === 'on' ? 'desktop' : s);

export interface DesktopModalProps {
  pc: OfficePc;
  state: PowerState;
  onChange: (state: PowerState) => void;
  onClose: () => void;
}

/** Missão 6: o monitor do computador, com a área de trabalho do sistema dele, para desligar pelo menu. */
export default function DesktopModal({ pc, state, onChange, onClose }: DesktopModalProps) {
  const [screen, setScreen] = useState<Screen>(screenOf(state));
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [tip, setTip] = useState(false);
  const [scale, setScale] = useState(0.8);
  const modalRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const { fullscreen, toggle, exit } = useFullscreen(modalRef);
  const busy = screen === 'shutting' || screen === 'restarting' || screen === 'booting';

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const list = timers.current;
    return () => {
      document.body.style.overflow = overflow;
      list.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  // a tela de 960 × 600 cabe no espaço que sobra
  useLayoutEffect(() => {
    const el = fitRef.current;
    if (!el) return;
    const fit = () => setScale(Math.max(0.2, Math.min((el.clientWidth - 40) / SCREEN.w, (el.clientHeight - 40) / SCREEN.h, 1.4)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy && !document.fullscreenElement) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

  const act = (action: PowerAction) => {
    const next = afterAction(action);
    const ok = action === 'shutdown';
    if (action === 'shutdown' || action === 'restart') {
      setScreen(action === 'shutdown' ? 'shutting' : 'restarting');
      setFeedback(null);
      later(SHUT_MS, () => {
        if (action === 'shutdown') {
          setScreen('off');
          onChange('off');
          setFeedback({ text: ACTION_FEEDBACK.shutdown, ok: true });
          return;
        }
        setScreen('booting');
        later(BOOT_MS, () => {
          setScreen('desktop');
          onChange('on');
          setFeedback({ text: ACTION_FEEDBACK.restart, ok: false });
        });
      });
      return;
    }
    setScreen(screenOf(next));
    onChange(next);
    setFeedback({ text: ACTION_FEEDBACK[action], ok });
  };

  const wake = () => {
    setScreen('desktop');
    onChange('on');
    setFeedback({ text: 'Mexeu o mouse e o computador acordou: ele estava só suspenso.', ok: false });
  };

  const login = () => {
    setScreen('desktop');
    onChange('on');
    setFeedback(null);
  };

  const close = () => {
    exit();
    onClose();
  };

  const Desktop = DESKTOPS[pc.os];

  return createPortal(
    <div
      ref={modalRef}
      className={fullscreen ? 'office-os-modal is-fullscreen' : 'office-os-modal'}
      role="dialog"
      aria-modal="true"
      aria-label={`Computador: ${pc.place} (${OS_NAMES[pc.os]})`}
    >
      <div className="office-os-box">
        <header className="office-os-head">
          <strong>
            🖥️ {pc.place} · <span className="office-os-name">{OS_NAMES[pc.os]}</span>
          </strong>
          <span className="office-spacer" />
          <button type="button" className="office-os-btn" onClick={() => setTip((t) => !t)} aria-pressed={tip}>
            💡 Dica
          </button>
          <button type="button" className="office-os-btn" onClick={toggle} aria-pressed={fullscreen}>
            {fullscreen ? '🗗 Sair da tela cheia' : '⛶ Tela cheia'}
          </button>
          <button type="button" className={screen === 'off' ? 'office-os-btn office-primary' : 'office-os-btn'} disabled={busy} onClick={close} autoFocus={screen === 'off'}>
            {screen === 'off' ? 'Voltar ao escritório ▶' : 'Sair (Esc)'}
          </button>
        </header>
        <p className="office-os-tip">
          {tip ? (
            <>
              <strong>Como desligar no {OS_NAMES[pc.os]}:</strong> {SHUTDOWN_HOW[pc.os]}
            </>
          ) : (
            'Desligue o computador pelo sistema, sem arrancar o cabo da tomada. Cada sistema esconde o "desligar" num lugar diferente!'
          )}
        </p>
        <div className="office-os-fit" ref={fitRef}>
          <div className="office-os-monitor" style={{ width: SCREEN.w * scale + 28, height: SCREEN.h * scale + 28 }}>
            <div className="office-os-glass" style={{ width: SCREEN.w * scale, height: SCREEN.h * scale }}>
              <div className="office-os-scaler" style={{ width: SCREEN.w, height: SCREEN.h, transform: `scale(${scale})` }}>
                {screen === 'desktop' && <Desktop user={pc.user} onAction={act} />}
                {screen === 'login' && <LoginScreen os={pc.os} user={pc.user} onLogin={login} onAction={act} />}
                {(screen === 'shutting' || screen === 'restarting' || screen === 'booting') && <StatusScreen os={pc.os} kind={screen} />}
                {screen === 'sleep' && (
                  <button type="button" className="os-screen os-black" onClick={wake} aria-label="Tela apagada (clique para mexer o mouse)" />
                )}
                {screen === 'off' && <div className="os-screen os-black" aria-label="Computador desligado" />}
              </div>
            </div>
            <span className={`office-os-led is-${screen === 'off' ? 'off' : screen === 'sleep' ? 'sleep' : 'on'}`} title="Luz de energia" />
          </div>
        </div>
        <p className={feedback ? (feedback.ok ? 'office-os-feedback is-ok' : 'office-os-feedback is-warn') : 'office-os-feedback'} role="status">
          {feedback?.text ?? ' '}
        </p>
      </div>
    </div>,
    document.body,
  );
}
