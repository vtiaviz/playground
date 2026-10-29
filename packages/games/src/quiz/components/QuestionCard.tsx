import { useEffect, useId } from 'react';
import { isEditable, realTarget, useGameInstance } from '../../shared/instance';
import RichText from './RichText';
import { LETTERS, type Question } from '../lib/quiz';

interface Props {
  question: Question;
  selected: number | null; // alternativa escolhida; null = ainda não respondeu
  onAnswer: (index: number) => void;
  disabled?: boolean;
}

export default function QuestionCard({ question, selected, onAnswer, disabled }: Props) {
  const questionId = useId();
  const instance = useGameInstance();
  const answered = selected !== null;
  const { correct } = question;

  // Atalhos: A–F ou 1–6 escolhem a alternativa. Ignora Ctrl/Alt/Cmd e campos de texto
  // (por exemplo, o editor ao lado do preview).
  useEffect(() => {
    if (answered || disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!instance.isActive()) return; // com vários jogos na página, só o último tocado recebe o teclado
      if (isEditable(realTarget(e))) return; // no Shadow DOM, e.target no window é só o "host"
      if (e.key.length !== 1) return;

      let idx = LETTERS.indexOf(e.key.toUpperCase());
      if (idx < 0 && /^[1-6]$/.test(e.key)) idx = Number(e.key) - 1;
      if (idx >= 0 && idx < question.options.length) {
        e.preventDefault();
        onAnswer(idx);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answered, disabled, question.options.length, onAnswer, instance]);

  return (
    <div className="qz-card">
      <div className="qz-question" id={questionId}>
        <RichText text={question.text} />
      </div>

      <div className="qz-options" role="group" aria-labelledby={questionId}>
        {question.options.map((option, i) => {
          const state = !answered ? '' : i === correct ? 'is-correct' : i === selected ? 'is-wrong' : 'is-dim';
          // além da cor, ✓ e ✗ no lugar da letra (não depender só de verde/vermelho)
          const badge = answered && i === correct ? '✓' : answered && i === selected ? '✗' : LETTERS[i];
          return (
            <button
              key={i}
              type="button"
              className={`qz-option ${state}`.trim()}
              disabled={answered || disabled}
              onClick={() => onAnswer(i)}
            >
              <span className="qz-letter" aria-hidden="true">
                {badge}
              </span>
              <span className="qz-sr-letter">{LETTERS[i]}) </span>
              <span className="qz-text">
                <RichText text={option} />
              </span>
              {answered && i === correct && <span className="qz-sr">resposta certa</span>}
              {answered && i === selected && i !== correct && <span className="qz-sr">sua resposta, errada</span>}
            </button>
          );
        })}
      </div>

      <p
        className={`qz-feedback${answered ? (selected === correct ? ' is-correct' : ' is-wrong') : ''}`}
        aria-live="polite"
      >
        {answered ? (selected === correct ? 'Acertou!' : `Errou. A resposta certa é ${LETTERS[correct]}.`) : ''}
      </p>
    </div>
  );
}
