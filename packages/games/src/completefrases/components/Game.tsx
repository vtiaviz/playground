import { useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { useStopwatch } from '../hooks/useStopwatch';
import { formatTime } from '../lib/format';
import { POINTS_PER_BLANK, frasesScore, type FrasesScore } from '../lib/scoring';
import { shuffle } from '../lib/sentences';
import { blankCount, type GameConfig } from '../config';
import { useFocusReport } from '../../shared/focus';
import type { GameFocus, GameResult, ItemResult } from '../../types';

// intro -> playing -> confirm (pergunta "enviar mesmo?") -> done. O envio é único.
type Phase = 'intro' | 'playing' | 'confirm' | 'done';

interface Chip {
  id: number;
  word: string;
}

interface Props {
  config: GameConfig;
  compact?: boolean; // sem altura de tela cheia (preview do editor)
  onComplete?: (result: GameResult) => void; // chamado uma vez, ao enviar as respostas
  onStart?: () => void; // ao clicar em Começar
  allowRestart?: boolean; // false = sem "Jogar de novo" (padrão: true)
  onFocusChange?: (focus: GameFocus | null) => void; // frase em jogo, para o tutor IA
  random?: () => number; // só para os testes (ordem do banco de palavras)
}

const DOUBLE_TAP_MS = 400;
const MESSAGES = ['Continue estudando: você consegue!', 'Bom começo!', 'Muito bem!', 'Excelente!'];
const stars = (percent: number): 0 | 1 | 2 | 3 => (percent >= 80 ? 3 : percent >= 50 ? 2 : percent >= 20 ? 1 : 0);

export default function Game({ config, compact, onComplete, onStart, onFocusChange, allowRestart = true, random }: Props) {
  const { sentences } = config;
  const total = blankCount(config);
  // primeira lacuna (índice global) de cada frase
  const offsets = useMemo(() => {
    let n = 0;
    return sentences.map((s) => {
      const at = n;
      n += s.answers.length;
      return at;
    });
  }, [sentences]);

  const newBank = () =>
    shuffle(
      [...sentences.flatMap((s) => s.answers), ...config.decoys].map((word, id) => ({ id, word })),
      random,
    );

  const sw = useStopwatch();
  const [bank, setBank] = useState<Chip[]>(newBank); // ordem fixa durante a partida
  const [placed, setPlaced] = useState<(number | null)[]>(() => Array(total).fill(null)); // lacuna -> chip
  const [selected, setSelected] = useState<number | null>(null); // chip escolhido por toque
  const [phase, setPhase] = useState<Phase>('intro');
  const [score, setScore] = useState<FrasesScore | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [copy, setCopy] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [overBank, setOverBank] = useState(false);
  const [overBlank, setOverBlank] = useState<number | null>(null);
  const drag = useRef<{ chip: number; from: number | null } | null>(null);
  const lastTap = useRef<{ blank: number; at: number } | null>(null);
  // tempo por lacuna: o intervalo desde a última jogada vai para a lacuna mexida agora
  const lastMoveAt = useRef(0);
  const blankSeconds = useRef<number[]>([]);
  const { start, stop, read } = sw;
  // tutor IA: a frase da última lacuna mexida (no começo, a primeira frase com lacuna vazia)
  const [lastBlank, setLastBlank] = useState<number | null>(null);
  const sentenceOf = (blank: number) => offsets.reduce((found, at, i) => (at <= blank ? i : found), 0);
  const focusSentence =
    lastBlank !== null ? sentenceOf(lastBlank) : Math.max(0, sentences.findIndex((s, i) => s.answers.some((_, k) => placed[offsets[i] + k] === null)));
  const wordAt = (blank: number) => {
    const c = placed[blank];
    return c === null || c === undefined ? null : (bank.find((x) => x.id === c)?.word ?? null);
  };
  useFocusReport(
    onFocusChange,
    phase === 'playing' || phase === 'confirm'
      ? {
          item: focusSentence,
          state: `Como a frase está agora: ${sentences[focusSentence].segments
            .map((seg, k) => (k < sentences[focusSentence].answers.length ? `${seg}[${wordAt(offsets[focusSentence] + k) ?? '___'}]` : seg))
            .join('')}`,
        }
      : null,
  );

  const resetTracking = () => {
    lastMoveAt.current = 0;
    blankSeconds.current = Array(total).fill(0);
    setLastBlank(null);
  };
  const mark = (blank: number) => {
    setLastBlank(blank);
    const now = read();
    blankSeconds.current[blank] = (blankSeconds.current[blank] ?? 0) + (now - lastMoveAt.current);
    lastMoveAt.current = now;
  };

  // o tempo só começa ao clicar em Começar (como nos outros jogos)
  const begin = () => {
    setPhase('playing');
    start();
    resetTracking();
    onStart?.();
  };

  const locked = phase === 'done';
  const byId = useMemo(() => new Map(bank.map((c) => [c.id, c])), [bank]);
  const used = new Set(placed.filter((x): x is number => x !== null));
  const filled = placed.filter((x) => x !== null).length;
  const decoys = config.decoys.length;
  const wordCount = total + decoys;

  // ---- mover palavras ----
  const put = (chip: number, blank: number, from: number | null = null) => {
    mark(blank);
    setPlaced((prev) => {
      const next = [...prev];
      const old = next[blank];
      if (from !== null) next[from] = from === blank ? chip : old; // arrastar entre lacunas troca as duas
      else for (let i = 0; i < next.length; i++) if (next[i] === chip) next[i] = null;
      next[blank] = chip;
      return next;
    });
    setSelected(null);
    if (phase === 'confirm') setPhase('playing');
  };

  const clear = (blank: number) => {
    mark(blank);
    setPlaced((prev) => prev.map((c, i) => (i === blank ? null : c)));
    if (phase === 'confirm') setPhase('playing');
  };

  const tapBlank = (blank: number) => {
    if (locked) return;
    if (selected !== null) {
      put(selected, blank);
      lastTap.current = null;
      return;
    }
    if (placed[blank] === null) return;
    // duplo clique/toque devolve a palavra ao banco (o dblclick não dispara em todo celular)
    const now = Date.now();
    const last = lastTap.current;
    if (last && last.blank === blank && now - last.at <= DOUBLE_TAP_MS) {
      clear(blank);
      lastTap.current = null;
    } else {
      lastTap.current = { blank, at: now };
    }
  };

  const keyBlank = (e: KeyboardEvent, blank: number) => {
    if (!locked && (e.key === 'Delete' || e.key === 'Backspace') && placed[blank] !== null) {
      e.preventDefault();
      clear(blank);
    }
  };

  const startDrag = (e: DragEvent, chip: number, from: number | null) => {
    if (locked) return e.preventDefault();
    drag.current = { chip, from };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', byId.get(chip)?.word ?? ''); // o Firefox só arrasta com algum dado
  };
  const endDrag = () => {
    drag.current = null;
    setOverBank(false);
    setOverBlank(null);
  };
  const allowDrop = (e: DragEvent) => {
    if (!drag.current || locked) return false;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return true;
  };
  const dropOnBlank = (e: DragEvent, blank: number) => {
    if (!allowDrop(e) || !drag.current) return;
    put(drag.current.chip, blank, drag.current.from);
    endDrag();
  };
  const dropOnBank = (e: DragEvent) => {
    if (!allowDrop(e) || !drag.current) return;
    if (drag.current.from !== null) clear(drag.current.from);
    endDrag();
  };

  // ---- envio ----
  const submit = () => {
    const s = stop();
    // o tempo de revisão (da última jogada até o envio) é dividido entre as lacunas
    const review = total > 0 ? Math.max(0, s - lastMoveAt.current) / total : 0;
    const words = placed.map((c) => (c === null ? null : (byId.get(c)?.word ?? null)));
    const result = frasesScore(sentences, words);
    setScore(result);
    setSeconds(s);
    setSelected(null);
    setPhase('done');
    onComplete?.({
      score: result.score,
      maxScore: result.max,
      durationSeconds: Math.round(s),
      details: {
        correct: result.correct,
        total: result.total,
        percent: result.percent,
        answers: words,
        items: result.results.map(
          (ok, i): ItemResult => ({ correct: ok ? 1 : 0, seconds: Math.round(((blankSeconds.current[i] ?? 0) + review) * 10) / 10 }),
        ),
      },
    });
  };

  const restart = () => {
    setBank(newBank());
    setPlaced(Array(total).fill(null));
    setSelected(null);
    setScore(null);
    setCopy('idle');
    setPhase('playing');
    start();
    resetTracking();
    onStart?.();
  };

  const copyResult = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopy('ok');
    } catch {
      setCopy('fail'); // sem permissão (ex.: acesso pelo IP da rede): mostra o texto para copiar à mão
    }
  };

  // ---- desenho ----
  const blankEl = (blank: number, answer: string) => {
    const chip = placed[blank];
    const word = chip === null ? null : (byId.get(chip)?.word ?? null);
    const ok = score?.results[blank];
    const cls = [
      'cf-blank',
      word !== null && 'is-filled',
      locked && (ok ? 'is-correct' : 'is-wrong'),
      !locked && selected !== null && 'is-target',
      overBlank === blank && 'is-over',
    ]
      .filter(Boolean)
      .join(' ');
    const label = locked
      ? `Lacuna ${blank + 1}: ${word ?? 'vazia'}, ${ok ? 'correta' : `incorreta, resposta certa: ${answer}`}`
      : word === null
        ? `Lacuna ${blank + 1}, vazia`
        : `Lacuna ${blank + 1}, preenchida com ${word}. Clique duas vezes para devolver ao banco`;
    return (
      <button
        key={`b${blank}`}
        type="button"
        className={cls}
        aria-label={label}
        aria-disabled={locked || undefined}
        draggable={!locked && chip !== null}
        onClick={() => tapBlank(blank)}
        onKeyDown={(e) => keyBlank(e, blank)}
        onDragStart={(e) => chip !== null && startDrag(e, chip, blank)}
        onDragEnd={endDrag}
        onDragOver={(e) => allowDrop(e) && setOverBlank(blank)}
        onDragLeave={() => setOverBlank((b) => (b === blank ? null : b))}
        onDrop={(e) => dropOnBlank(e, blank)}
      >
        {word ?? <span className="cf-line" aria-hidden="true" />}
      </button>
    );
  };

  const rootClass = compact ? 'cf-root cf-compact' : 'cf-root';
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  if (phase === 'intro') {
    return (
      <div className={rootClass}>
        <div className="cf-card cf-intro">
          <h1>{config.title}</h1>
          <ul className="cf-rules">
            <li>
              {plural(sentences.length, 'frase', 'frases')} · {plural(total, 'lacuna', 'lacunas')} · {wordCount} palavras no banco
              {decoys > 0 && ` (${decoys} ${decoys === 1 ? 'sobra' : 'sobram'} para confundir)`}
            </li>
            <li>Arraste a palavra até a lacuna, ou toque na palavra e depois na lacuna</li>
            <li>Clique duas vezes numa lacuna preenchida para devolver a palavra ao banco</li>
            <li>
              {POINTS_PER_BLANK} pontos por lacuna certa. Você envia as respostas uma única vez
            </li>
          </ul>
          <button type="button" className="cf-btn" onClick={begin}>
            Começar
          </button>
        </div>
      </div>
    );
  }

  const sentenceList = (
    <ol className="cf-list">
      {sentences.map((s, i) => {
        const first = offsets[i];
        const allOk = score ? s.answers.every((_, j) => score.results[first + j]) : false;
        return (
          <li key={i} className="cf-item">
            <p className="cf-sentence">
              <span className="cf-num" aria-hidden="true">
                {i + 1}
              </span>
              {s.segments.map((seg, j) => (
                <span key={j}>
                  {seg}
                  {j < s.answers.length && blankEl(first + j, s.answers[j])}
                </span>
              ))}
            </p>
            {score && (
              <p className={allOk ? 'cf-feedback is-correct' : 'cf-feedback is-wrong'}>
                <strong>{allOk ? 'Correto.' : 'Incorreto.'}</strong>{' '}
                {!allOk && `Resposta certa: ${s.answers.map((a) => `“${a}”`).join(', ')}. `}
                {s.explanation}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );

  if (locked && score) {
    const resultText = `${config.title}: ${score.score}/${score.max} pontos · ${score.correct} de ${score.total} lacunas certas · tempo ${formatTime(seconds)}`;
    return (
      <div className={rootClass}>
        <div className="cf-card cf-results" aria-label="Resultado">
          <h1>{config.title}</h1>
          <div className="cf-stars" role="img" aria-label={`${stars(score.percent)} de 3 estrelas`}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < stars(score.percent) ? 'on' : undefined} aria-hidden="true">
                ★
              </span>
            ))}
          </div>
          <p className="cf-message">{MESSAGES[stars(score.percent)]}</p>
          <p className="cf-total">
            <strong>{score.score}</strong> / {score.max} pontos
          </p>
          <p>
            {score.correct} de {score.total} {score.total === 1 ? 'lacuna certa' : 'lacunas certas'} · Tempo: {formatTime(seconds)}
          </p>
          {copy === 'fail' && (
            <input
              className="cf-copy-fallback"
              readOnly
              aria-label="Resultado para copiar"
              value={resultText}
              onFocus={(e) => e.currentTarget.select()}
              autoFocus
            />
          )}
          <div className="cf-actions">
            <button type="button" className="cf-btn cf-btn-light" onClick={() => copyResult(resultText)}>
              {copy === 'ok' ? 'Copiado!' : 'Copiar resultado'}
            </button>
            {allowRestart && (
              <button type="button" className="cf-btn" onClick={restart}>
                Jogar de novo
              </button>
            )}
          </div>
        </div>
        <h2 className="cf-subtitle">Correção</h2>
        {sentenceList}
      </div>
    );
  }

  return (
    <div className={rootClass}>
      <h1>{config.title}</h1>

      <div className="cf-hud" role="status">
        <span>
          {filled}/{total} lacunas
        </span>
        <span>⏱ {formatTime(sw.seconds)}</span>
      </div>

      <section
        className={overBank ? 'cf-bank is-over' : 'cf-bank'}
        aria-label="Banco de palavras"
        onDragOver={(e) => allowDrop(e) && drag.current?.from !== null && setOverBank(true)}
        onDragLeave={() => setOverBank(false)}
        onDrop={dropOnBank}
      >
        <p className="cf-bank-title">
          Banco de palavras · {selected !== null ? 'agora toque na lacuna' : 'arraste ou toque para selecionar'}
        </p>
        <div className="cf-chips">
          {bank.map((c) =>
            used.has(c.id) ? null : (
              <button
                key={c.id}
                type="button"
                className={selected === c.id ? 'cf-chip is-selected' : 'cf-chip'}
                aria-pressed={selected === c.id}
                draggable
                onClick={() => setSelected((s) => (s === c.id ? null : c.id))}
                onDragStart={(e) => startDrag(e, c.id, null)}
                onDragEnd={endDrag}
              >
                {c.word}
              </button>
            ),
          )}
          {used.size === bank.length && <span className="cf-empty">Todas as palavras foram usadas.</span>}
        </div>
      </section>

      {sentenceList}

      {phase === 'playing' ? (
        <div className="cf-actions">
          <button type="button" className="cf-btn" disabled={filled < total} onClick={() => setPhase('confirm')}>
            Enviar respostas
          </button>
          <span className="cf-note">
            {filled < total ? `Faltam ${plural(total - filled, 'lacuna', 'lacunas')}.` : 'Tudo preenchido.'} Clique duas vezes numa
            lacuna preenchida para devolver a palavra.
          </span>
        </div>
      ) : (
        <div className="cf-card cf-confirm" role="alertdialog" aria-label="Confirmar envio">
          <p>Enviar agora? Depois do envio não dá para mudar as respostas.</p>
          <div className="cf-actions">
            <button type="button" className="cf-btn" autoFocus onClick={submit}>
              Confirmar envio
            </button>
            <button type="button" className="cf-btn cf-btn-light" onClick={() => setPhase('playing')}>
              Revisar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
