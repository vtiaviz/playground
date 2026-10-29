import RichText from './RichText';
import { formatTime } from '../lib/format';
import { LETTERS, type Question } from '../lib/quiz';
import type { QuizScore } from '../lib/scoring';

interface Props {
  title: string;
  score: QuizScore;
  questions: Question[];
  choices: number[]; // alternativa escolhida em cada pergunta
  onRestart?: () => void; // sem isto, o botão "Jogar de novo" some (atividade de uma tentativa)
}

const MESSAGES = ['Continue estudando: você consegue!', 'Bom começo!', 'Muito bem!', 'Excelente!'];

// Primeira linha útil do enunciado (sem as linhas ```), encurtada para a revisão
function firstLine(text: string, max = 90): string {
  const line = text.split('\n').find((l) => l.trim() !== '' && !l.trim().startsWith('```')) ?? text;
  const t = line.trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

export default function Results({ title, score, questions, choices, onRestart }: Props) {
  return (
    <div className="qz-panel qz-results">
      <h1>{title}</h1>

      <div className="qz-stars" role="img" aria-label={`${score.stars} de 3 estrelas`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={i < score.stars ? 'on' : undefined} aria-hidden="true">
            ★
          </span>
        ))}
      </div>
      <p className="qz-message">{MESSAGES[score.stars]}</p>

      <p className="qz-total">
        <strong>{score.score}</strong> / {score.max} pontos
      </p>
      <p>
        {score.correct} de {score.total} {score.total === 1 ? 'questão certa' : 'questões certas'} · Tempo: {formatTime(score.seconds)}
      </p>
      <p className="qz-ref">
        Acertos: +{score.accuracyPoints} · Tempo: +{score.timeBonus} (bônus máximo até {formatTime(score.referenceSeconds)})
      </p>

      <ol className="qz-review">
        {questions.map((q, i) => {
          const ok = choices[i] === q.correct;
          return (
            <li key={i} className={ok ? 'is-correct' : 'is-wrong'}>
              <span className="qz-mark" aria-label={ok ? 'certa' : 'errada'}>
                {ok ? '✓' : '✗'}
              </span>
              <div>
                <div className="qz-review-q">
                  {i + 1}. <RichText text={firstLine(q.text)} />
                </div>
                {ok ? (
                  <div className="qz-review-a">
                    {LETTERS[q.correct]}) <RichText text={q.options[q.correct]} />
                  </div>
                ) : (
                  <>
                    <div className="qz-review-a">
                      Sua resposta: {LETTERS[choices[i]]}) <RichText text={q.options[choices[i]]} />
                    </div>
                    <div className="qz-review-a">
                      Gabarito: {LETTERS[q.correct]}) <RichText text={q.options[q.correct]} />
                    </div>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {onRestart && (
        <button type="button" className="qz-btn" onClick={onRestart}>
          Jogar de novo
        </button>
      )}
    </div>
  );
}
