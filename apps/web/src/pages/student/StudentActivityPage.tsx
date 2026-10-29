import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { GameResult } from '@playground/games';
import { ApiError, api } from '../../api';
import ActivityContent from '../../components/ActivityContent';
import Modal from '../../components/Modal';
import { createBlockStore } from '../../lib/blockStore';
import { createTutorHandle, studentTutor } from '../../lib/tutor';
import type { Level, ScoreSaved, StudentActivityDetail, TutorStatus } from '../../types';
import FeedbackForm from './FeedbackForm';

type SaveState = 'saving' | 'saved' | 'error';

function Viewer({ initial }: { initial: StudentActivityDetail }) {
  const { activity } = initial;
  const content = useMemo(() => activity.content, [activity.content]);

  type Done = { score: number; maxScore: number; level?: Level | null; performance?: number | null };
  const [completed, setCompleted] = useState<Record<string, Done>>(() =>
    Object.fromEntries(initial.scores.map((s) => [s.blockId, { score: s.score, maxScore: s.maxScore, level: s.level, performance: s.performance }])),
  );
  // nível/config dos jogos adaptativos que mudam depois que a página abriu, e o desempenho de cada partida
  const blockStore = useMemo(() => createBlockStore(), []);
  // tutor IA: botão "Pedir ajuda" em cada jogo (se a API estiver com o tutor ligado)
  const tutor = useMemo(() => createTutorHandle(), []);
  useEffect(() => {
    api<TutorStatus>('/student/tutor')
      .then((s) => tutor.set(studentTutor(activity.id, s)))
      .catch(() => tutor.set(null));
  }, [activity.id, tutor]);
  const levelShown = useRef<Record<string, Level | null>>(
    Object.fromEntries(
      (activity.content.content ?? []).filter((n) => n.type === 'gameBlock').map((n) => [String(n.attrs?.blockId), (n.attrs?.level as Level | null) ?? null]),
    ),
  );
  const adaptiveCount = Object.values(levelShown.current).filter(Boolean).length;
  // o cartão "concluído" é para jogos feitos antes de abrir a página; o jogo terminado agora
  // continua mostrando a tela de resultado dele (com o desempenho por cima)
  const doneAtLoad = useRef(completed);

  const [saveState, setSaveState] = useState<Record<string, SaveState>>({});
  const results = useRef<Record<string, GameResult>>({});
  const [feedback, setFeedback] = useState(initial.feedback);
  const [askFeedback, setAskFeedback] = useState(false);

  const doneCount = Object.keys(completed).length;
  const finished = activity.gameCount === 0 || doneCount >= activity.gameCount;
  const totalScore = Object.values(completed).reduce((s, c) => s + c.score, 0);

  const save = useCallback(
    async (blockId: string) => {
      const result = results.current[blockId];
      if (!result) return;
      setSaveState((s) => ({ ...s, [blockId]: 'saving' }));
      try {
        const r = await api<ScoreSaved>(`/student/activities/${activity.id}/scores`, {
          body: {
            blockId,
            score: result.score,
            maxScore: result.maxScore,
            durationSeconds: result.durationSeconds,
            details: result.details,
          },
        });
        setSaveState((s) => ({ ...s, [blockId]: 'saved' }));
        setCompleted((c) => ({ ...c, [blockId]: { score: result.score, maxScore: result.maxScore } }));
        blockStore.set(blockId, { feedback: { performance: r.performance, level: r.level } });
        // jogos adaptativos ainda não começados passam para o nível novo
        for (const g of r.updatedGames ?? []) {
          levelShown.current[g.blockId] = g.level;
          blockStore.set(g.blockId, { level: g.level, config: g.config });
        }
      } catch (e) {
        if (e instanceof ApiError && e.code === 'ALREADY_PLAYED') {
          // já estava gravado (outra aba/aparelho): vale a nota que está no servidor
          setSaveState((s) => ({ ...s, [blockId]: 'saved' }));
          setCompleted((c) => ({ ...c, [blockId]: { score: result.score, maxScore: result.maxScore } }));
        } else {
          setSaveState((s) => ({ ...s, [blockId]: 'error' }));
        }
      }
    },
    [activity.id, blockStore],
  );

  // "Começar": trava o nível do jogo adaptativo no servidor. Se o nível mudou nesse meio-tempo
  // (outra aba), o jogo recomeça já no nível certo.
  const onGameStart = useCallback(
    (blockId: string) => {
      api<{ game: { level: Level | null; config: unknown } }>(`/student/activities/${activity.id}/start`, { body: { blockId } })
        .then(({ game }) => {
          if (game.level && game.level !== levelShown.current[blockId]) {
            levelShown.current[blockId] = game.level;
            blockStore.set(blockId, { level: game.level, config: game.config });
          }
        })
        .catch(() => {
          /* sem conexão: a nota ainda é conferida no envio */
        });
    },
    [activity.id, blockStore],
  );

  const onGameComplete = useCallback(
    (blockId: string, result: GameResult) => {
      results.current[blockId] = result;
      void save(blockId);
    },
    [save],
  );

  // ao terminar o último jogo, convida a avaliar a atividade (uma vez)
  const prompted = useRef(false);
  useEffect(() => {
    if (!prompted.current && activity.gameCount > 0 && finished && !feedback && doneCount > initial.scores.length) {
      prompted.current = true;
      setAskFeedback(true);
    }
  }, [finished, feedback, doneCount, activity.gameCount, initial.scores.length]);

  const failed = Object.entries(saveState).filter(([, v]) => v === 'error');
  const saving = Object.values(saveState).some((v) => v === 'saving');

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{activity.title}</h1>
          {activity.gameCount > 0 && (
            <p className="hint">
              {doneCount}/{activity.gameCount} {activity.gameCount === 1 ? 'jogo' : 'jogos'} · {totalScore} pontos
              {finished && ' · Atividade concluída ✅'}
            </p>
          )}
          {adaptiveCount > 0 && (
            <p className="hint">🎯 Os jogos marcados com o nível se ajustam ao seu desempenho: acertos e o tempo em cada pergunta.</p>
          )}
        </div>
        <div className="actions">
          <Link to="/aluno" className="button-link secondary">
            ← Atividades
          </Link>
        </div>
      </div>

      {saving && <p className="hint">Salvando sua nota…</p>}
      {failed.map(([blockId]) => (
        <p key={blockId} className="error" role="alert">
          Não foi possível salvar a nota de um jogo. Não feche esta página.{' '}
          <button type="button" className="secondary small" onClick={() => void save(blockId)}>
            Tentar de novo
          </button>
        </p>
      ))}

      <section className="panel">
        <ActivityContent
          content={content}
          allowRestart={false}
          onGameComplete={onGameComplete}
          onGameStart={onGameStart}
          blockStore={blockStore}
          tutor={tutor}
          getCompleted={(id) => doneAtLoad.current[id]}
        />
      </section>

      {finished && (
        <section className="panel">
          <h2>Sua avaliação</h2>
          <FeedbackForm activityId={activity.id} initial={feedback} onSaved={setFeedback} />
        </section>
      )}

      {askFeedback && (
        <Modal title="Atividade concluída! 🎉" onClose={() => setAskFeedback(false)}>
          <p>
            Você fez <strong>{totalScore}</strong> de {activity.maxScore} pontos.
          </p>
          <FeedbackForm
            activityId={activity.id}
            initial={feedback}
            onSaved={(f) => {
              setFeedback(f);
              setAskFeedback(false);
            }}
          />
          <div className="actions">
            <button type="button" className="secondary" onClick={() => setAskFeedback(false)}>
              Avaliar depois
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function StudentActivityPage() {
  const { id } = useParams();
  const [data, setData] = useState<StudentActivityDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setData(null);
    api<StudentActivityDetail>(`/student/activities/${id}`)
      .then(setData)
      .catch((e) => setError(e instanceof ApiError && e.status === 404 ? 'Atividade não encontrada.' : e instanceof ApiError ? e.message : 'Erro inesperado.'));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="hint">Carregando…</p>;
  return <Viewer key={data.activity.id} initial={data} />;
}
