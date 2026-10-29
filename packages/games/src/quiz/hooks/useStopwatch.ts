import { useCallback, useEffect, useRef, useState } from 'react';

// Cronômetro que só conta o tempo "ativo": pausa quando a aba fica em segundo plano e retoma
// quando volta. start() zera; pause()/resume() param e retomam (o jogo pausa durante o
// feedback de cada questão); stop() congela e devolve os segundos.
export function useStopwatch() {
  const acc = useRef(0);                       // ms já acumulados
  const since = useRef<number | null>(null);   // início do trecho em andamento (null = pausado/parado)
  const active = useRef(false);                // true entre start() e stop()
  const paused = useRef(false);                // pausado de propósito (pause())
  const [seconds, setSeconds] = useState(0);   // valor exibido (inteiro)

  const read = useCallback(
    () => (acc.current + (since.current === null ? 0 : performance.now() - since.current)) / 1000,
    [],
  );

  const start = useCallback(() => {
    acc.current = 0;
    active.current = true;
    paused.current = false;
    since.current = document.hidden ? null : performance.now();
    setSeconds(0);
  }, []);

  const pause = useCallback(() => {
    if (!active.current || paused.current) return;
    if (since.current !== null) {
      acc.current += performance.now() - since.current;
      since.current = null;
    }
    paused.current = true;
    setSeconds(Math.floor(acc.current / 1000));
  }, []);

  const resume = useCallback(() => {
    if (!active.current || !paused.current) return;
    paused.current = false;
    since.current = document.hidden ? null : performance.now();
  }, []);

  const stop = useCallback(() => {
    const s = read();
    acc.current = s * 1000;
    since.current = null;
    active.current = false;
    paused.current = false;
    setSeconds(Math.floor(s));
    return s;
  }, [read]);

  useEffect(() => {
    const onVisibility = () => {
      if (!active.current || paused.current) return;
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
      if (active.current && !paused.current) setSeconds(Math.floor(read()));
    }, 250);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(id);
    };
  }, [read]);

  return { seconds, start, pause, resume, stop, read };
}
