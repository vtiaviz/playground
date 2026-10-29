import { useEffect, useRef, useState } from 'react';
import { clockAt } from './forca';

export interface RelogioPassandoProps {
  /** Hora de começo, em minutos do dia (ex.: 14h05 = 845), e quantos minutos passam. */
  from: number;
  minutes: number;
  caption: string;
  /** Quanto dura na tela, em ms. */
  duration?: number;
  onDone: () => void;
}

/** Relógio no topo da tela com os ponteiros girando rápido: "alguns minutos depois…". */
export default function RelogioPassando({ from, minutes, caption, duration = 4000, onDone }: RelogioPassandoProps) {
  const [k, setK] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const start = performance.now();
    let finished = false;
    const id = window.setInterval(() => {
      const v = Math.min(1, (performance.now() - start) / duration);
      setK(v);
      if (v >= 1 && !finished) {
        finished = true;
        window.setTimeout(() => done.current(), 700);
      }
    }, 40);
    return () => window.clearInterval(id);
  }, [duration]);

  const m = from + minutes * k;
  const minuteAngle = (m % 60) * 6;
  const hourAngle = ((m / 60) % 12) * 30;
  return (
    <div className="office-clock" role="status" aria-live="polite">
      <svg viewBox="0 0 40 40" className="office-clock-face" aria-hidden="true">
        <circle cx={20} cy={20} r={18} fill="#fffaf0" stroke="#1c1626" strokeWidth={3} />
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} x={19} y={4} width={2} height={i % 3 ? 2 : 4} fill="#1c1626" transform={`rotate(${i * 30} 20 20)`} />
        ))}
        <rect x={18.5} y={10} width={3} height={11} rx={1} fill="#1c1626" transform={`rotate(${hourAngle} 20 20)`} />
        <rect x={19.2} y={6} width={1.6} height={15} rx={0.8} fill="#f54129" transform={`rotate(${minuteAngle} 20 20)`} />
        <circle cx={20} cy={20} r={2} fill="#1c1626" />
      </svg>
      <span className="office-clock-text">
        <strong>{clockAt(from, minutes, k)}</strong>
        <span>{caption}</span>
      </span>
    </div>
  );
}
