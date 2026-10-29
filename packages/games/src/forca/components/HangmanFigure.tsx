
// Partes do boneco, na ordem em que aparecem a cada erro (6 no total)
const PARTS = [
  <circle key="head" cx="140" cy="78" r="22" />,
  <line key="body" x1="140" y1="100" x2="140" y2="158" />,
  <line key="armL" x1="140" y1="116" x2="112" y2="142" />,
  <line key="armR" x1="140" y1="116" x2="168" y2="142" />,
  <line key="legL" x1="140" y1="158" x2="116" y2="196" />,
  <line key="legR" x1="140" y1="158" x2="164" y2="196" />,
];

export default function HangmanFigure({ errors }: { errors: number }) {
  const shown = Math.max(0, Math.min(errors, PARTS.length));
  return (
    <svg
      className="hg-figure"
      viewBox="0 0 200 230"
      role="img"
      aria-label={`Forca com ${shown} de ${PARTS.length} partes do boneco`}
    >
      <g className="hg-gallows">
        <line x1="20" y1="214" x2="120" y2="214" />
        <line x1="50" y1="214" x2="50" y2="30" />
        <line x1="50" y1="30" x2="140" y2="30" />
        <line x1="140" y1="30" x2="140" y2="56" />
      </g>
      <g className="hg-body">{PARTS.slice(0, shown)}</g>
    </svg>
  );
}
