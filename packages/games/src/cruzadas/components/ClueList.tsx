import type { Layout } from '../lib/crossword';

interface Props {
  layout: Layout;
  activeIndex: number | null; // palavra ativa (destacada)
  onSelect: (index: number) => void;
}

const GROUPS = [
  { dir: 'across', title: 'Horizontais' },
  { dir: 'down', title: 'Verticais' },
] as const;

export default function ClueList({ layout, activeIndex, onSelect }: Props) {
  return (
    <div className="cw-clues">
      {GROUPS.map((g) => (
        <section key={g.dir}>
          <h2>{g.title}</h2>
          <ul>
            {layout.words.map((w, i) =>
              w.dir === g.dir ? (
                <li key={i}>
                  <button
                    type="button"
                    className={i === activeIndex ? 'is-active' : undefined}
                    aria-current={i === activeIndex ? 'true' : undefined}
                    onClick={() => onSelect(i)}
                  >
                    <b>{w.number}.</b> {w.clue}
                  </button>
                </li>
              ) : null,
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}
