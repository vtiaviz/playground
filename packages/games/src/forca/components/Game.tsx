import { useMemo, useState } from 'react';
import HangmanFigure from './HangmanFigure';
import Keyboard from './Keyboard';
import Results from './Results';
import WordDisplay from './WordDisplay';
import { useStopwatch } from '../hooks/useStopwatch';
import { formatTime } from '../lib/format';
import { cells, errorsLeft, guess, MAX_ERRORS, newWord, validateWord, type WordState } from '../lib/hangman';
import { gameScore, wordScore, type WordResult } from '../lib/scoring';
import type { GameConfig } from '../lib/share';
import { useFocusReport } from '../../shared/focus';
import type { GameFocus, GameResult, ItemResult } from '../../types';

// Palavra acertada vale 1, menos 0,1 por letra errada (mínimo 0,5); perdida vale 0
const itemResult = (r: WordResult): ItemResult => ({
  correct: r.won ? Math.max(0.5, 1 - 0.1 * r.errors) : 0,
  seconds: Math.round(r.seconds * 10) / 10,
  errors: r.errors,
});

// intro -> playing -> between (resultado da palavra) -> playing ... -> final
type Phase = 'intro' | 'playing' | 'between' | 'final';

interface Props {
  config: GameConfig;
  compact?: boolean; // sem altura de tela cheia (preview do editor)
  onComplete?: (result: GameResult) => void; // chamado uma vez, ao terminar a partida
  onStart?: () => void; // ao clicar em Começar
  allowRestart?: boolean; // false = sem "Jogar de novo" (padrão: true)
  onFocusChange?: (focus: GameFocus | null) => void; // item em jogo, para o tutor IA
}

export default function Game({ config, compact, onComplete, onStart, onFocusChange, allowRestart = true }: Props) {
  const secrets = useMemo(
    () =>
      config.words.flatMap((w) => {
        const c = validateWord(w);
        return c.ok ? [c.secret] : [];
      }),
    [config.words],
  );
  const total = secrets.length;

  const sw = useStopwatch();
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [word, setWord] = useState<WordState | null>(null);
  const [results, setResults] = useState<WordResult[]>([]);
  // tutor IA: a palavra em jogo e o que o aluno já descobriu dela
  useFocusReport(
    onFocusChange,
    phase === 'playing' && word
      ? {
          item: index,
          state: [
            `Palavra na tela: ${cells(word).map((c) => (c.visible ? c.char : '_')).join(' ')}`,
            `Letras erradas: ${word.wrong.join(', ') || 'nenhuma'}`,
            `Erros restantes: ${errorsLeft(word)}`,
          ].join('. '),
        }
      : null,
  );

  const startGame = () => {
    setResults([]);
    setIndex(0);
    setWord(newWord(secrets[0]));
    setPhase('playing');
    sw.start();
    onStart?.();
  };

  const finishWord = (done: WordState) => {
    const seconds = sw.stop();
    const all = [
      ...results,
      { word: done.secret.display, won: done.status === 'won', errors: done.wrong.length, seconds },
    ];
    setResults(all);
    setPhase('between');

    // A partida acaba ao fim da última palavra (e não ao clicar em "Ver resultado")
    if (all.length === total) {
      const g = gameScore(all);
      onComplete?.({
        score: g.total,
        maxScore: g.max,
        durationSeconds: Math.round(g.totalSeconds),
        details: {
          percent: g.percent,
          stars: g.stars,
          wordsWon: g.wordsWon,
          errors: g.totalErrors,
          words: all.map((r) => ({ word: r.word, won: r.won, errors: r.errors, seconds: Math.round(r.seconds) })),
          items: all.map((r) => itemResult(r)),
        },
      });
    }
  };

  const onGuess = (letter: string) => {
    if (phase !== 'playing' || !word) return;
    const next = guess(word, letter);
    if (next === word) return; // letra repetida ou inválida
    setWord(next);
    if (next.status !== 'playing') finishWord(next);
  };

  const nextWord = () => {
    if (index + 1 >= total) {
      setPhase('final');
      return;
    }
    setIndex(index + 1);
    setWord(newWord(secrets[index + 1]));
    setPhase('playing');
    sw.start();
  };

  const rootClass = compact ? 'hg-root hg-compact' : 'hg-root';

  if (total === 0) {
    return (
      <div className={rootClass}>
        <p>Este jogo não tem palavras válidas.</p>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div className={rootClass}>
        <div className="hg-card hg-intro">
          <h1>{config.title}</h1>
          {config.theme && (
            <p className="hg-theme">
              Tema: <strong>{config.theme}</strong>
            </p>
          )}
          <ul className="hg-rules">
            <li>{total} palavras em sequência</li>
            <li>{MAX_ERRORS} erros por palavra</li>
            <li>Menos erros e mais rapidez rendem mais pontos</li>
          </ul>
          <button type="button" className="hg-btn" onClick={startGame}>
            Começar
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'final') {
    return (
      <div className={rootClass}>
        <Results title={config.title} results={results} onRestart={allowRestart ? startGame : undefined} />
      </div>
    );
  }

  // playing / between
  const last = results[results.length - 1];
  const isLast = index + 1 >= total;

  return (
    <div className={rootClass}>
      <div className="hg-hud">
        <span>
          Palavra {index + 1}/{total}
        </span>
        <span>⏱ {formatTime(sw.seconds)}</span>
        <span>{gameScore(results).total} pts</span>
      </div>

      {config.theme && (
        <p className="hg-theme">
          Tema: <strong>{config.theme}</strong>
        </p>
      )}

      <HangmanFigure errors={word!.wrong.length} />
      <WordDisplay cells={cells(word!)} />

      {phase === 'between' && last ? (
        <div className="hg-card hg-between" aria-live="polite">
          <strong>{last.won ? `Acertou! +${wordScore(last)} pontos` : 'Não foi dessa vez.'}</strong>
          <span>
            {last.errors} {last.errors === 1 ? 'erro' : 'erros'} · {formatTime(last.seconds)}
          </span>
          <button type="button" className="hg-btn" autoFocus onClick={nextWord}>
            {isLast ? 'Ver resultado' : 'Próxima palavra'}
          </button>
        </div>
      ) : (
        <p className="hg-hint" aria-live="polite">
          {errorsLeft(word!)} erros restantes
        </p>
      )}

      <Keyboard
        guessed={word!.guessed}
        wrong={word!.wrong}
        disabled={phase !== 'playing'}
        onGuess={onGuess}
      />
    </div>
  );
}
