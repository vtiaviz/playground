import { useMemo, useRef, useState } from 'react';
import Board from './Board';
import WordList from './WordList';
import { useStopwatch } from '../hooks/useStopwatch';
import { formatTime } from '../lib/format';
import { generate, type Placement } from '../lib/generator';
import { DEFAULT_PARAMS, referenceSeconds, wordSearchScore, type WordSearchScore } from '../lib/scoring';
import type { GameConfig } from '../lib/share';
import { useFocusReport } from '../../shared/focus';
import type { GameFocus, GameResult, ItemResult } from '../../types';

const keyOf = (p: Placement) => `${p.row}-${p.col}-${p.base}`;

// intro -> playing -> final (o jogo termina sozinho quando todas as palavras foram achadas)
type Phase = 'intro' | 'playing' | 'final';

const MESSAGES = ['Concluído! Tente fazer mais rápido da próxima vez.', 'Bom trabalho!', 'Muito bem!', 'Excelente!'];

interface Props {
  config: GameConfig;
  compact?: boolean; // sem altura mínima de tela cheia
  onComplete?: (result: GameResult) => void; // chamado uma vez, ao achar a última palavra
  onStart?: () => void; // ao clicar em Começar
  allowRestart?: boolean; // false = sem "Jogar de novo" (padrão: true)
  onFocusChange?: (focus: GameFocus | null) => void; // item em jogo, para o tutor IA
}

export default function Game({ config, compact, onComplete, onStart, onFocusChange, allowRestart = true }: Props) {
  const puzzle = useMemo(
    () =>
      generate({
        words: config.words,
        seed: config.seed,
        size: config.size,
        directions: config.directions,
      }),
    [config],
  );

  const sw = useStopwatch();
  const [phase, setPhase] = useState<Phase>('intro');
  const [foundKeys, setFoundKeys] = useState<string[]>([]);
  const [score, setScore] = useState<WordSearchScore | null>(null);
  // por palavra: tempo desde a palavra anterior e seleções erradas nesse intervalo
  const lastAt = useRef(0);
  const misses = useRef(0);
  const items = useRef<Record<string, ItemResult>>({});
  // tutor IA: o jogo todo (as palavras ficam à vista; a ajuda é sobre onde e como procurar)
  const foundNames = foundKeys.map((k) => puzzle.placements.find((p) => keyOf(p) === k)?.display).filter(Boolean);
  useFocusReport(
    onFocusChange,
    phase === 'playing' ? { item: null, state: `Palavras já encontradas: ${foundNames.join(', ') || 'nenhuma'}` } : null,
  );

  const total = puzzle.placements.length;
  const rootClass = compact ? 'player compact' : 'player';

  if (total === 0) {
    return (
      <div className={rootClass}>
        <h1>{config.title}</h1>
        <p className="player-error">Este caça-palavras não tem palavras.</p>
      </div>
    );
  }

  const start = () => {
    setFoundKeys([]);
    setScore(null);
    setPhase('playing');
    sw.start();
    lastAt.current = 0;
    misses.current = 0;
    items.current = {};
    onStart?.();
  };

  const onMiss = () => {
    if (phase === 'playing') misses.current += 1;
  };

  // Mantém a ordem em que foram achadas (define a cor do destaque)
  const found = foundKeys
    .map((k) => puzzle.placements.find((p) => keyOf(p) === k))
    .filter((p): p is Placement => Boolean(p));
  const foundSet = new Set(found.map(keyOf));

  const onFound = (p: Placement) => {
    if (phase !== 'playing') return;
    const k = keyOf(p);
    if (foundKeys.includes(k)) return;

    const next = [...foundKeys, k];
    setFoundKeys(next);
    const isLast = next.length === total;
    const now = isLast ? sw.stop() : sw.read();
    // o jogo só termina com todas achadas: cada erro de seleção desconta 0,1 da palavra (mínimo 0,5)
    items.current[k] = {
      correct: Math.max(0.5, 1 - 0.1 * misses.current),
      seconds: Math.round((now - lastAt.current) * 10) / 10,
      errors: misses.current,
    };
    lastAt.current = now;
    misses.current = 0;

    if (isLast) {
      const s = wordSearchScore(total, now);
      setScore(s);
      setPhase('final');
      onComplete?.({
        score: s.score,
        maxScore: s.max,
        durationSeconds: Math.round(s.seconds),
        details: {
          words: total,
          percent: s.percent,
          stars: s.stars,
          timeBonus: s.timeBonus,
          referenceSeconds: Math.round(s.referenceSeconds),
          items: puzzle.placements.map((p) => items.current[keyOf(p)] ?? { correct: 1, seconds: 0 }),
        },
      });
    }
  };

  if (phase === 'intro') {
    return (
      <div className={rootClass}>
        <h1>{config.title}</h1>
        <div className="ws-card">
          <ul className="ws-rules">
            <li>{total} {total === 1 ? 'palavra escondida' : 'palavras escondidas'} na grade</li>
            <li>Arraste do início ao fim de cada palavra para marcá-la</li>
            <li>
              {DEFAULT_PARAMS.pointsPerWord} pontos por palavra, mais bônus de tempo (até{' '}
              {DEFAULT_PARAMS.maxTimeBonusPerWord} por palavra) se terminar em até{' '}
              {formatTime(referenceSeconds(total))}
            </li>
            <li>O tempo começa quando você clicar em Começar</li>
          </ul>
          <button type="button" className="ws-btn" onClick={start}>
            Começar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={rootClass}>
      <h1>{config.title}</h1>

      <div className="ws-hud">
        <span>
          {found.length}/{total} palavras
        </span>
        <span>⏱ {formatTime(sw.seconds)}</span>
      </div>

      <Board puzzle={puzzle} found={found} onFound={onFound} onMiss={onMiss} />

      <WordList items={puzzle.placements.map((p) => ({ label: p.display, found: foundSet.has(keyOf(p)) }))} />

      {phase === 'final' && score && (
        <div className="ws-card ws-results" aria-live="polite">
          <div className="ws-stars" role="img" aria-label={`${score.stars} de 3 estrelas`}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < score.stars ? 'on' : undefined} aria-hidden="true">
                ★
              </span>
            ))}
          </div>
          <p className="ws-message">{MESSAGES[score.stars]}</p>
          <p className="ws-total">
            <strong>{score.score}</strong> / {score.max} pontos
          </p>
          <p className="ws-summary">
            {total} {total === 1 ? 'palavra' : 'palavras'} · Tempo: {formatTime(score.seconds)}
          </p>
          <p className="ws-summary">
            Bônus de tempo: +{score.timeBonus} (máximo até {formatTime(score.referenceSeconds)})
          </p>
          {allowRestart && (
            <button type="button" className="ws-btn" onClick={start}>
              Jogar de novo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
