import { getGame, isGameType } from '@playground/games';

// Cada tipo de jogo tem uma das cores do controle do logo (azul, verde, vermelho, amarelo);
// o Complete as Frases, que veio depois, usa roxo (visível nos temas claro e escuro).
const COLORS: Record<string, string> = {
  QUIZ: 'var(--dot-blue)',
  CACA_PALAVRAS: 'var(--dot-green)',
  FORCA: 'var(--dot-red)',
  CRUZADAS: 'var(--amber)',
  COMPLETE_FRASES: '#8b5cf6',
};

export default function GameTypeBadge({ type }: { type: string }) {
  const label = isGameType(type) ? getGame(type).label : type;
  return (
    <span className="type-badge">
      <span className="type-dot" style={{ background: COLORS[type] ?? 'var(--line-strong)' }} aria-hidden="true" />
      {label}
    </span>
  );
}
