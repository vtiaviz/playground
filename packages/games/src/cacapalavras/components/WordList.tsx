interface Item {
  label: string;
  found: boolean;
}

// Lista de palavras em ordem alfabética; as encontradas ficam acinzentadas
export default function WordList({ items }: { items: Item[] }) {
  const sorted = [...items].sort((a, b) => a.label.localeCompare(b.label, 'pt'));
  return (
    <ul className="word-list">
      {sorted.map((it) => (
        <li key={it.label} className={it.found ? 'found' : undefined}>
          {it.label}
        </li>
      ))}
    </ul>
  );
}
