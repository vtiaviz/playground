import type { ReactNode } from 'react';
import { formatTime } from '../lib/format';
import type { CrosswordScore } from '../lib/scoring';

interface Props {
  title: string;
  score: CrosswordScore;
  onRestart?: () => void; // sem isto, o botão "Jogar de novo" some (atividade de uma tentativa)
  children?: ReactNode; // ex.: a grade resolvida
}

const MESSAGES = ['Concluído! Tente fazer mais rápido da próxima vez.', 'Bom trabalho!', 'Muito bem!', 'Excelente!'];

export default function Results({ title, score, onRestart, children }: Props) {
  const penalized = score.effectiveSeconds !== score.seconds;

  return (
    <div className="cw-card cw-results">
      <h1>{title}</h1>

      <div className="cw-stars" role="img" aria-label={`${score.stars} de 3 estrelas`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={i < score.stars ? 'on' : undefined} aria-hidden="true">
            ★
          </span>
        ))}
      </div>
      <p className="cw-message">{MESSAGES[score.stars]}</p>

      <p className="cw-total">
        <strong>{score.score}</strong> / {score.max} pontos
      </p>
      <p>Tempo: {formatTime(score.seconds)}</p>
      {penalized && <p>Tempo com penalidades: {formatTime(score.effectiveSeconds)}</p>}
      {score.checks > 0 && <p>Verificações usadas: {score.checks}</p>}
      <p className="cw-ref">Pontuação máxima até {formatTime(score.referenceSeconds)}</p>

      {children}

      {onRestart && (
        <button type="button" className="cw-btn" onClick={onRestart}>
          Jogar de novo
        </button>
      )}
    </div>
  );
}
