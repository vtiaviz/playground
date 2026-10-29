import type { Level } from '../types';

export const LEVEL_LABEL: Record<Level, string> = { easy: 'Fácil', normal: 'Normal', hard: 'Difícil' };
const ICON: Record<Level, string> = { easy: '▁', normal: '▃', hard: '▅' };

// Nível sempre com texto (não só cor); as barrinhas reforçam a ordem Fácil < Normal < Difícil
export default function LevelBadge({ level, locked, title }: { level: Level; locked?: boolean; title?: string }) {
  return (
    <span className={`level-badge level-${level}`} title={title}>
      <span aria-hidden="true">{ICON[level]}</span> {LEVEL_LABEL[level]}
      {locked && <span title="Nível fixado pelo instrutor"> 🔒</span>}
    </span>
  );
}
