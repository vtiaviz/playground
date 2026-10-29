import { useMemo, useRef, useState } from 'react';
import ClueList from './ClueList';
import Grid from './Grid';
import Results from './Results';
import { useStopwatch } from '../hooks/useStopwatch';
import { buildGrid, compareInput } from '../lib/crossword';
import { formatTime } from '../lib/format';
import { activeWordIndex, emptyInput, initialSelection, selectWord } from '../lib/navigation';
import { DEFAULT_PARAMS, crosswordScore, referenceSeconds, type CrosswordScore } from '../lib/scoring';
import type { GameConfig } from '../lib/share';
import { useFocusReport } from '../../shared/focus';
import type { GameFocus, GameResult, ItemResult } from '../../types';

// intro -> playing -> final (o jogo termina sozinho quando todas as letras estão certas)
type Phase = 'intro' | 'playing' | 'final';

interface Props {
  config: GameConfig;
  compact?: boolean; // sem margens de página inteira (preview do editor)
  onComplete?: (result: GameResult) => void; // chamado uma vez, ao terminar a partida
  onStart?: () => void; // ao clicar em Começar
  allowRestart?: boolean; // false = sem "Jogar de novo" (padrão: true)
  onFocusChange?: (focus: GameFocus | null) => void; // item em jogo, para o tutor IA
}

export default function Game({ config, compact, onComplete, onStart, onFocusChange, allowRestart = true }: Props) {
  const { layout } = config;
  const grid = useMemo(() => buildGrid(layout), [layout]);
  const cellCount = useMemo(() => grid.flat().filter(Boolean).length, [grid]);

  const sw = useStopwatch();
  const [phase, setPhase] = useState<Phase>('intro');
  const [input, setInput] = useState(() => emptyInput(layout));
  const [selection, setSelection] = useState(() => initialSelection(layout));
  const [wrong, setWrong] = useState<ReadonlySet<string>>(new Set());
  const [checks, setChecks] = useState(0);
  const [note, setNote] = useState('');
  const [score, setScore] = useState<CrosswordScore | null>(null);
  // por palavra: tempo digitando nela e letras erradas digitadas nas células dela
  const lastEditAt = useRef(0);
  const wordSeconds = useRef<number[]>([]);
  const wordErrors = useRef<number[]>([]);
  // tutor IA: a palavra selecionada e as letras que o aluno já digitou nela
  const focusIdx = phase === 'playing' ? activeWordIndex(grid, selection) : null;
  const focusWord = focusIdx !== null ? layout.words[focusIdx] : null;
  useFocusReport(
    onFocusChange,
    focusWord
      ? {
          item: focusIdx,
          state: `Letras já digitadas nesta palavra: ${[...focusWord.answer]
            .map((_, k) => input[focusWord.row + (focusWord.dir === 'down' ? k : 0)]?.[focusWord.col + (focusWord.dir === 'across' ? k : 0)] || '_')
            .join(' ')}`,
        }
      : null,
  );

  const rootClass = compact ? 'cw-root cw-compact' : 'cw-root';

  if (layout.words.length === 0) {
    return (
      <div className={rootClass}>
        <p>Esta cruzada não tem palavras.</p>
      </div>
    );
  }

  const start = () => {
    setInput(emptyInput(layout));
    setSelection(initialSelection(layout));
    setWrong(new Set());
    setChecks(0);
    setNote('');
    setScore(null);
    setPhase('playing');
    sw.start();
    lastEditAt.current = 0;
    wordSeconds.current = layout.words.map(() => 0);
    wordErrors.current = layout.words.map(() => 0);
    onStart?.();
  };

  // O tempo desde a última digitação vai para a palavra selecionada; letra errada conta erro
  // para as palavras (horizontal e vertical) que passam pela célula.
  const track = (nextInput: string[][], solved: boolean) => {
    const now = solved ? sw.stop() : sw.read();
    const w = activeWordIndex(grid, selection);
    if (w !== null) wordSeconds.current[w] += now - lastEditAt.current;
    lastEditAt.current = now;
    grid.forEach((line, r) =>
      line.forEach((cell, c) => {
        const typed = nextInput[r]?.[c] ?? '';
        if (!cell || typed === '' || typed === input[r]?.[c] || typed === cell.letter) return;
        if (cell.across !== null) wordErrors.current[cell.across] += 1;
        if (cell.down !== null) wordErrors.current[cell.down] += 1;
      }),
    );
    return now;
  };

  const onChange = (nextInput: string[][], nextSelection: typeof selection) => {
    setSelection(nextSelection);
    if (nextInput === input) return; // só mudou a seleção: mantém as marcações de erro

    setInput(nextInput);
    setWrong(new Set());
    setNote('');
    const solved = compareInput(grid, nextInput).solved;
    const now = track(nextInput, solved);
    if (solved) {
      const s = crosswordScore(now, cellCount, checks);
      const items: ItemResult[] = layout.words.map((_, i) => ({
        correct: Math.max(0.5, 1 - 0.15 * (wordErrors.current[i] ?? 0)),
        seconds: Math.round((wordSeconds.current[i] ?? 0) * 10) / 10,
        errors: wordErrors.current[i] ?? 0,
      }));
      setScore(s);
      setPhase('final');
      onComplete?.({
        score: s.score,
        maxScore: s.max,
        durationSeconds: Math.round(s.seconds),
        details: {
          stars: s.stars,
          checks: s.checks,
          effectiveSeconds: Math.round(s.effectiveSeconds),
          referenceSeconds: Math.round(s.referenceSeconds),
          items,
        },
      });
    }
  };

  const check = () => {
    const cmp = compareInput(grid, input);
    setChecks((n) => n + 1);
    setWrong(new Set(cmp.wrong.map((w) => `${w.row},${w.col}`)));

    const penalty = DEFAULT_PARAMS.checkPenaltySeconds;
    const cost = penalty > 0 ? ` (+${penalty} s no tempo)` : '';
    const n = cmp.wrong.length;
    setNote(
      n > 0
        ? `${n} ${n === 1 ? 'letra errada marcada' : 'letras erradas marcadas'}.${cost}`
        : `Nenhuma letra errada. Faltam ${cmp.empty} ${cmp.empty === 1 ? 'célula' : 'células'}.${cost}`,
    );
  };

  if (phase === 'intro') {
    return (
      <div className={rootClass}>
        <div className="cw-card cw-intro">
          <h1>{config.title}</h1>
          <ul className="cw-rules">
            <li>
              {layout.words.length} palavras · {cellCount} letras
            </li>
            <li>O tempo começa quando você clicar em Começar</li>
            <li>
              Pontuação máxima se terminar em até {formatTime(referenceSeconds(cellCount))}; depois disso a
              pontuação cai com o tempo
            </li>
          </ul>
          <button type="button" className="cw-btn" onClick={start}>
            Começar
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'final' && score) {
    const solution = grid.map((row) => row.map((c) => (c ? c.letter : '')));
    return (
      <div className={rootClass}>
        <Results title={config.title} score={score} onRestart={allowRestart ? start : undefined}>
          <Grid
            layout={layout}
            input={solution}
            selection={{ row: -1, col: -1, dir: 'across' }}
            disabled
            onChange={() => {}}
          />
        </Results>
      </div>
    );
  }

  const idx = activeWordIndex(grid, selection);
  const word = idx !== null ? layout.words[idx] : null;
  const filled = input.flat().filter((l) => l !== '').length;

  return (
    <div className={rootClass}>
      <h1 className="cw-title">{config.title}</h1>

      <div className="cw-hud">
        <span>
          {filled}/{cellCount} letras
        </span>
        <span>⏱ {formatTime(sw.seconds)}</span>
      </div>

      <p className="cw-current">
        {word && (
          <>
            <strong>
              {word.number} {word.dir === 'across' ? 'Horizontal' : 'Vertical'}
            </strong>{' '}
            · {word.clue}
          </>
        )}
      </p>

      <Grid layout={layout} input={input} selection={selection} wrong={wrong} onChange={onChange} />

      <ClueList layout={layout} activeIndex={idx} onSelect={(i) => setSelection(selectWord(layout, i))} />

      <div className="cw-actions">
        <button type="button" className="cw-btn" onClick={check}>
          Verificar
        </button>
        <span className="cw-note" aria-live="polite">
          {note}
        </span>
      </div>
    </div>
  );
}
