import { useEffect, useRef } from 'react';
import type { GameFocus } from '../types';

// Avisa o tutor IA sobre o item em jogo, só quando ele muda de verdade (o jogo re-renderiza a
// cada segundo por causa do cronômetro). Ao desmontar, avisa que não há mais nada em jogo.
export function useFocusReport(onFocusChange: ((f: GameFocus | null) => void) | undefined, focus: GameFocus | null) {
  const cb = useRef(onFocusChange);
  cb.current = onFocusChange;
  const key = focus ? `${focus.item}|${focus.state}` : '';
  const last = useRef(''); // começa em "nada em jogo": não avisa à toa ao montar

  useEffect(() => {
    if (last.current === key) return;
    last.current = key;
    cb.current?.(focus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => () => cb.current?.(null), []);
}
