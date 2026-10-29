import { formatTime } from '../lib/format';
import { gameScore, wordScore, type WordResult } from '../lib/scoring';

interface Props {
  title: string;
  results: WordResult[];
  onRestart?: () => void; // sem isto, o botão "Jogar de novo" some (atividade de uma tentativa)
}

const MESSAGES = ['Não foi dessa vez. Tente de novo!', 'Bom começo!', 'Muito bem!', 'Excelente!'];

export default function Results({ title, results, onRestart }: Props) {
  const g = gameScore(results);

  return (
    <div className="hg-card hg-results">
      <h1>{title}</h1>

      <div className="hg-stars" role="img" aria-label={`${g.stars} de 3 estrelas`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={i < g.stars ? 'on' : undefined} aria-hidden="true">
            ★
          </span>
        ))}
      </div>
      <p className="hg-message">{MESSAGES[g.stars]}</p>

      <p className="hg-total">
        <strong>{g.total}</strong> / {g.max} pontos ({g.percent}%)
      </p>
      <p className="hg-summary">
        {g.wordsWon} de {results.length} palavras · {g.totalErrors} erros · {formatTime(g.totalSeconds)}
      </p>

      <div className="hg-table-wrap">
        <table className="hg-table">
          <thead>
            <tr>
              <th>Palavra</th>
              <th>Erros</th>
              <th>Tempo</th>
              <th>Pontos</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i}>
                <td>
                  <span aria-label={r.won ? 'acertou' : 'errou'}>{r.won ? '✓' : '✗'}</span> {r.word}
                </td>
                <td>{r.errors}</td>
                <td>{formatTime(r.seconds)}</td>
                <td>{wordScore(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {onRestart && (
        <button type="button" className="hg-btn" onClick={onRestart}>
          Jogar de novo
        </button>
      )}
    </div>
  );
}
