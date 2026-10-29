import { useMemo, useRef, useState } from 'react';
import QuestionCard from './QuestionCard';
import Results from './Results';
import { useStopwatch } from '../hooks/useStopwatch';
import { formatTime } from '../lib/format';
import { quizScore, referenceSeconds, type QuizScore } from '../lib/scoring';
import type { GameConfig } from '../lib/share';
import { useFocusReport } from '../../shared/focus';
import type { GameFocus, GameResult, ItemResult } from '../../types';

// intro -> playing (pergunta aberta -> feedback -> próxima) -> final
type Phase = 'intro' | 'playing' | 'final';

interface Props {
  config: GameConfig;
  compact?: boolean; // sem altura de tela cheia (preview do editor)
  onComplete?: (result: GameResult) => void; // chamado uma vez, ao terminar a partida
  onStart?: () => void; // ao clicar em Começar
  allowRestart?: boolean; // false = sem "Jogar de novo" (padrão: true)
  onFocusChange?: (focus: GameFocus | null) => void; // item em jogo, para o tutor IA
}

export default function Game({ config, compact, onComplete, onStart, onFocusChange, allowRestart = true }: Props) {
  const { questions } = config;
  const total = questions.length;
  const reference = useMemo(() => referenceSeconds(questions), [questions]);

  const sw = useStopwatch();
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null); // escolha na pergunta atual
  const [choices, setChoices] = useState<number[]>([]);          // escolhas já confirmadas
  const [score, setScore] = useState<QuizScore | null>(null);
  // tempo de cada questão: do momento em que aparece até a resposta (o feedback não conta)
  const shownAt = useRef(0);
  const times = useRef<number[]>([]);
  // tutor IA: a pergunta aberta (depois de responder, enquanto o aluno lê o resultado, não há o que ajudar)
  useFocusReport(onFocusChange, phase === 'playing' && selected === null ? { item: index, state: '' } : null);

  const rootClass = compact ? 'qz-root qz-compact' : 'qz-root';

  if (total === 0) {
    return (
      <div className={rootClass}>
        <p>Este quiz não tem perguntas.</p>
      </div>
    );
  }

  const start = () => {
    setChoices([]);
    setIndex(0);
    setSelected(null);
    setScore(null);
    setPhase('playing');
    sw.start();
    shownAt.current = 0;
    times.current = [];
    onStart?.();
  };

  const answer = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    const all = [...choices, i];
    setChoices(all);
    const isLastAnswer = all.length === total;
    // última pergunta: o tempo para aqui (e não ao clicar em "Ver resultado")
    const now = isLastAnswer ? sw.stop() : sw.read();
    times.current = [...times.current.slice(0, all.length - 1), now - shownAt.current];

    if (isLastAnswer) {
      const seconds = now;
      const items: ItemResult[] = all.map((c, k) => ({
        correct: c === questions[k].correct ? 1 : 0,
        seconds: Math.round((times.current[k] ?? 0) * 10) / 10,
      }));
      const s = quizScore(all.map((c, k) => c === questions[k].correct), seconds, reference);
      setScore(s);
      onComplete?.({
        score: s.score,
        maxScore: s.max,
        durationSeconds: Math.round(s.seconds),
        details: {
          correct: s.correct,
          total: s.total,
          percent: s.percent,
          stars: s.stars,
          accuracyPoints: s.accuracyPoints,
          timeBonus: s.timeBonus,
          choices: all,
          items,
        },
      });
    } else {
      sw.pause(); // o tempo de ler o feedback não conta
    }
  };

  const next = () => {
    if (index + 1 >= total) {
      setPhase('final');
      return;
    }
    setIndex(index + 1);
    setSelected(null);
    sw.resume();
    shownAt.current = sw.read();
  };

  if (phase === 'intro') {
    return (
      <div className={rootClass}>
        <div className="qz-panel qz-intro">
          <h1>{config.title}</h1>
          <ul className="qz-rules">
            <li>
              {total} {total === 1 ? 'questão' : 'questões'} de múltipla escolha
            </li>
            <li>Você vê na hora se acertou, e o tempo fica parado enquanto você lê o resultado</li>
            <li>
              100 pontos por acerto, mais um bônus de tempo (até 50 por acerto) se terminar em até{' '}
              {formatTime(reference)}
            </li>
          </ul>
          <button type="button" className="qz-btn" onClick={start}>
            Começar
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'final' && score) {
    return (
      <div className={rootClass}>
        <Results title={config.title} score={score} questions={questions} choices={choices} onRestart={allowRestart ? start : undefined} />
      </div>
    );
  }

  const correctSoFar = choices.filter((c, k) => c === questions[k].correct).length;
  const done = index + (selected !== null ? 1 : 0);
  const isLast = index + 1 >= total;

  return (
    <div className={rootClass}>
      <h1>{config.title}</h1>

      <div className="qz-hud">
        <span>
          Questão {index + 1}/{total}
        </span>
        <span>⏱ {formatTime(sw.seconds)}</span>
        <span>✓ {correctSoFar}</span>
      </div>

      <div
        className="qz-progress"
        role="progressbar"
        aria-label="Progresso"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
      >
        <div style={{ width: `${(done / total) * 100}%` }} />
      </div>

      <QuestionCard key={index} question={questions[index]} selected={selected} onAnswer={answer} />

      {selected !== null && (
        <button type="button" className="qz-btn" autoFocus onClick={next}>
          {isLast ? 'Ver resultado' : 'Próxima questão'}
        </button>
      )}
    </div>
  );
}
