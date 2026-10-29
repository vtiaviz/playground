import { useEffect } from 'react';
import { isEditable, realTarget, useGameInstance } from '../../shared/instance';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

interface Props {
  guessed: string[]; // letras base já tentadas
  wrong: string[];   // subconjunto de guessed que errou
  disabled?: boolean;
  onGuess: (letter: string) => void;
}

export default function Keyboard({ guessed, wrong, disabled, onGuess }: Props) {
  const instance = useGameInstance();
  // Teclado físico. Ignora atalhos (Ctrl/Alt/Cmd) e campos de texto (ex.: o editor ao lado do preview).
  useEffect(() => {
    if (disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!instance.isActive()) return; // com vários jogos na página, só o último tocado recebe o teclado
      if (isEditable(realTarget(e))) return; // no Shadow DOM, e.target no window é só o "host"
      if (e.key.length === 1) onGuess(e.key); // 'á' ou 'a' valem igual (normalizado na lógica)
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [disabled, onGuess, instance]);

  return (
    <div className="hg-keyboard" role="group" aria-label="Teclado">
      {ROWS.map((row) => (
        <div className="hg-krow" key={row}>
          {[...row].map((letter) => {
            const used = guessed.includes(letter);
            const bad = wrong.includes(letter);
            const cls = 'hg-key' + (used ? (bad ? ' is-wrong' : ' is-right') : '');
            const state = used ? (bad ? ', errada' : ', certa') : '';
            return (
              <button
                key={letter}
                type="button"
                className={cls}
                disabled={disabled || used}
                onClick={() => onGuess(letter)}
                aria-label={`Letra ${letter}${state}`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
