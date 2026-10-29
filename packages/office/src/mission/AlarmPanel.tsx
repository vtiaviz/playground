import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface AlarmPanelProps {
  /** Senha certa (o CEO conta na explicação da missão 6). */
  code: string;
  /** Senha certa + ATIVAR. */
  onArm: () => void;
  onClose: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'];

/** Teclado do alarme (perto da porta principal): digitar a senha e apertar ATIVAR. */
export default function AlarmPanel({ code, onArm, onClose }: AlarmPanelProps) {
  const [typed, setTyped] = useState('');
  const [msg, setMsg] = useState<{ text: string; bad?: boolean }>({ text: 'DIGITE A SENHA' });

  const press = (k: string) => {
    if (k === 'C') {
      setTyped('');
      setMsg({ text: 'DIGITE A SENHA' });
      return;
    }
    if (k === 'OK') {
      if (typed === code) {
        setMsg({ text: 'ALARME ATIVADO' });
        window.setTimeout(onArm, 700);
      } else {
        setMsg({ text: 'SENHA INCORRETA', bad: true });
        setTyped('');
      }
      return;
    }
    if (typed.length < 6) setTyped(typed + k);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Enter') press('OK');
      else if (e.key === 'Backspace') setTyped((t) => t.slice(0, -1));
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return createPortal(
    <div className="office-alarm-modal" role="dialog" aria-modal="true" aria-label="Painel do alarme">
      <div className="office-alarm">
        <div className="office-alarm-brand">
          <span className="office-alarm-led" /> ALARME · OFFICE
        </div>
        <div className={msg.bad ? 'office-alarm-display is-bad' : 'office-alarm-display'} aria-live="polite">
          <span>{msg.text}</span>
          <strong>{typed.replace(/./g, '●') || ' '}</strong>
        </div>
        <div className="office-alarm-keys">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              className={k === 'OK' ? 'is-ok' : k === 'C' ? 'is-clear' : ''}
              aria-label={k === 'OK' ? 'Ativar' : k === 'C' ? 'Limpar' : k}
              onClick={() => press(k)}
            >
              {k === 'OK' ? 'ATIVAR' : k}
            </button>
          ))}
        </div>
        <button type="button" className="office-alarm-cancel" onClick={onClose}>
          Cancelar (Esc)
        </button>
      </div>
    </div>,
    document.body,
  );
}
