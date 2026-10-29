import { useCallback, useEffect, useRef, useState } from 'react';

// Cronômetro que só conta o tempo "ativo": pausa quando a aba fica em segundo plano
// e retoma quando volta. start() zera; stop() congela e devolve os segundos.
export function useStopwatch() {
  const acc = useRef(0);                       // ms já acumulados
  const since = useRef<number | null>(null);   // início do trecho em andamento (null = pausado/parado)
  const active = useRef(false);                // true entre start() e stop()
  const [seconds, setSeconds] = useState(0);   // valor exibido (inteiro)

  const read = useCallback(
    () => (acc.current + (since.current === null ? 0 : performance.now() - since.current)) / 1000,
    [],
  );

  const start = useCallback(() => {
    acc.current = 0;
    active.current = true;
    since.current = document.hidden ? null : performance.now();
    setSeconds(0);
  }, []);

  const stop = useCallback(() => {
    const s = read();
    acc.current = s * 1000;
    since.current = null;
    active.current = false;
    setSeconds(Math.floor(s));
    return s;
  }, [read]);

  useEffect(() => {
    const onVisibility = () => {
      if (!active.current) return;
      if (document.hidden) {
        if (since.current !== null) {
          acc.current += performance.now() - since.current;
          since.current = null;
        }
      } else if (since.current === null) {
        since.current = performance.now();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    const id = setInterval(() => {
      if (active.current) setSeconds(Math.floor(read()));
    }, 250);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(id);
    };
  }, [read]);

  return { seconds, start, stop, read };
}
