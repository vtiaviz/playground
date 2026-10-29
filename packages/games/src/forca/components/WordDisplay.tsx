import type { CSSProperties } from 'react';
import type { Cell } from '../lib/hangman';

// Agrupa as células por palavra (separadas por espaço) para quebrar linha só entre palavras
function groupWords(cells: Cell[]): Cell[][] {
  const groups: Cell[][] = [[]];
  for (const c of cells) {
    if (c.char === ' ') groups.push([]);
    else groups[groups.length - 1].push(c);
  }
  return groups.filter((g) => g.length > 0);
}

export default function WordDisplay({ cells }: { cells: Cell[] }) {
  const groups = groupWords(cells);
  const longest = Math.max(1, ...groups.map((g) => g.length));
  const label = cells.map((c) => (c.char === ' ' ? '/' : c.visible ? c.char : 'lacuna')).join(' ');

  let index = 0;
  return (
    <div
      className="hg-word"
      style={{ '--n': longest } as CSSProperties}
      role="img"
      aria-label={`Palavra: ${label}`}
    >
      {groups.map((group, gi) => (
        <span className="hg-group" key={gi}>
          {group.map((c) => {
            const cls = ['hg-cell', !c.isLetter && 'hg-sep', c.missed && 'hg-missed']
              .filter(Boolean)
              .join(' ');
            return (
              <span className={cls} key={index++}>
                {c.visible ? c.char : ''}
              </span>
            );
          })}
        </span>
      ))}
    </div>
  );
}
