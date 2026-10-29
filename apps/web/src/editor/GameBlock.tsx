import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Node, NodeViewWrapper, ReactNodeViewRenderer, mergeAttributes, type NodeViewProps } from '@tiptap/react';
import { availableLevels, getGame, isGameType, type GameFocus, type GameResult, type GameType, type LevelConfigs } from '@playground/games';
import { api } from '../api';
import LevelBadge, { LEVEL_LABEL } from '../components/LevelBadge';
import TutorDock from '../components/TutorDock';
import { useTutor, type TutorHandle } from '../lib/tutor';
import { useBlockState, type BlockState, type BlockStore } from '../lib/blockStore';
import type { Level } from '../types';
import AdaptiveBuilderModal from './AdaptiveBuilder';
import { EditGameModal } from './GameModals';

export interface GameBlockOptions {
  // Só no modo leitura (aluno / pré-visualização)
  onGameComplete?: (blockId: string, result: GameResult) => void;
  onGameStart?: (blockId: string) => void;
  // Jogo que o aluno já concluiu: mostra a nota em vez de abrir o jogo de novo
  getCompleted?: (blockId: string) => { score: number; maxScore: number; level?: Level | null; performance?: number | null } | undefined;
  // Mudanças depois de a página abrir (nível novo, desempenho da partida)
  blockStore?: BlockStore;
  // Tutor IA (botão de ajuda) — só no modo leitura e quando a API tem o tutor ligado
  tutor?: TutorHandle;
  allowRestart: boolean;
}

const titleOf = (c: unknown) => (c as { title?: string } | null)?.title ?? '';
// "Redes — Normal" -> "Redes"
export const baseTitle = (t: string) => t.replace(/\s*[—–-]\s*(Fácil|Normal|Difícil)\s*$/i, '').trim() || t;

function PerformanceNote({ feedback }: { feedback: BlockState['feedback'] }) {
  if (!feedback) return null;
  const { performance: p, level } = feedback;
  const msg =
    level?.change === 'up'
      ? `🎉 Mandou bem! No próximo jogo deste tipo você sobe para o nível ${LEVEL_LABEL[level.after]}.`
      : level?.change === 'down'
        ? `Vamos reforçar a base: o próximo jogo deste tipo vem no nível ${LEVEL_LABEL[level.after]}.`
        : null;
  return (
    <div className="perf-note" role="status">
      <strong>Desempenho {p.score}/100</strong>
      <span>
        Acertos {p.accuracy}%{p.speed !== null && ` · Ritmo ${p.speed}%`}
        {p.avgSecondsPerItem !== null && ` · ${p.avgSecondsPerItem.toLocaleString('pt-BR')} s por item`}
      </span>
      {p.guesses > 0 && (
        <span className="hint">
          {p.guesses} {p.guesses === 1 ? 'resposta parece chute' : 'respostas parecem chute'} (errada rápido demais): leia com calma!
        </span>
      )}
      {msg && <span className="perf-msg">{msg}</span>}
    </div>
  );
}

function GameBlockView({ node, editor, extension, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const [editing, setEditing] = useState<Level | 'single' | null>(null);
  const [building, setBuilding] = useState(false);
  const [previewLevel, setPreviewLevel] = useState<Level>('normal');
  const [libState, setLibState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const attrs = node.attrs as {
    blockId: string;
    gameType: string;
    config: unknown;
    levels: LevelConfigs | null; // instrutor: as configs dos níveis
    level: Level | null; // aluno: o nível dele
    adaptive: boolean | null;
  };
  const { blockId, gameType, levels } = attrs;
  const options = extension.options as GameBlockOptions;
  const state = useBlockState(options.blockStore, blockId);
  const tutor = useTutor(options.tutor);
  const [focus, setFocus] = useState<GameFocus | null>(null);
  const playRef = useRef<HTMLDivElement>(null);

  if (!isGameType(gameType)) {
    return (
      <NodeViewWrapper className="game-block game-block-broken">
        <p className="error">Jogo desconhecido ({String(gameType)}).</p>
      </NodeViewWrapper>
    );
  }
  const game = getGame(gameType as GameType);
  const isAdaptive = Boolean(levels) || Boolean(attrs.adaptive);
  const present = levels ? availableLevels(levels) : [];

  // ---- modo leitura: o jogo de verdade ----
  if (!editor.isEditable) {
    const done = options.getCompleted?.(blockId);
    if (done) {
      return (
        <NodeViewWrapper className="game-block game-block-done" contentEditable={false}>
          <span aria-hidden="true">✅</span> <strong>{game.label}</strong> concluído — {done.score} / {done.maxScore} pontos
          {done.level && (
            <>
              {' '}
              · <LevelBadge level={done.level} />
            </>
          )}
          {done.performance != null && <> · desempenho {done.performance}/100</>}
        </NodeViewWrapper>
      );
    }

    // pré-visualização do instrutor: escolhe qual nível testar; aluno: o nível dele
    const level: Level | null = levels
      ? present.includes(previewLevel)
        ? previewLevel
        : (present[0] ?? null)
      : (state?.level ?? attrs.level);
    const config = levels ? (level ? levels[level] : attrs.config) : (state?.config ?? attrs.config);
    const valid = game.validateConfig(config) !== null;

    return (
      <NodeViewWrapper className="game-block game-block-play" contentEditable={false}>
        {isAdaptive && level && (
          <div className="adaptive-bar">
            {levels ? (
              <>
                <span className="hint">🎯 Jogo adaptativo — testar o nível:</span>
                <span className="seg" role="tablist">
                  {present.map((l) => (
                    <button key={l} type="button" role="tab" aria-selected={l === level} className={l === level ? 'on' : ''} onClick={() => setPreviewLevel(l)}>
                      {LEVEL_LABEL[l]}
                    </button>
                  ))}
                </span>
              </>
            ) : (
              <>
                <LevelBadge level={level} />
                <span className="hint">Desafio ajustado ao seu desempenho nos jogos de {game.label}.</span>
              </>
            )}
          </div>
        )}
        <PerformanceNote feedback={state?.feedback} />
        {valid ? (
          <>
            <div ref={playRef}>
              <game.Player
                key={level ?? 'fixo'} // nível novo = jogo novo
                config={config}
                allowRestart={options.allowRestart}
                onStart={() => options.onGameStart?.(blockId)}
                onComplete={(r: GameResult) => options.onGameComplete?.(blockId, r)}
                onFocusChange={setFocus}
              />
            </div>
            {tutor && (
              <TutorDock
                key={level ?? 'fixo'}
                tutor={tutor}
                blockId={blockId}
                gameType={gameType}
                config={config}
                gameLabel={game.label}
                focus={focus}
                watchRef={playRef}
              />
            )}
          </>
        ) : (
          <p className="error">A configuração deste jogo está inválida.</p>
        )}
      </NodeViewWrapper>
    );
  }

  // ---- modo edição: cartão com resumo ----
  const config = attrs.config;
  const valid = game.validateConfig(config) !== null;
  const setLevels = (next: LevelConfigs) => {
    const first = availableLevels(next)[0];
    updateAttributes({ levels: next, config: next.normal ?? (first ? next[first] : config) });
  };

  return (
    <NodeViewWrapper className={selected ? 'game-block game-block-card selected' : 'game-block game-block-card'} contentEditable={false}>
      <div className="game-card-main" data-drag-handle>
        <span className="game-card-icon" aria-hidden="true">
          {isAdaptive ? '🎯' : '🎮'}
        </span>
        <div>
          <strong>{game.label}</strong>
          {isAdaptive && <span className="badge info adaptive-tag">Adaptativo · {present.length} níveis</span>}
          {isAdaptive && levels ? (
            <div className="hint">
              {baseTitle(titleOf(config))} · {present.map((l) => `${LEVEL_LABEL[l]}: ${game.summarize(levels[l])}`).join(' · ')}
            </div>
          ) : (
            <div className="hint">
              {valid ? `${titleOf(config)} · ${game.summarize(config)} · até ${game.maxScore(config)} pontos` : 'Configuração inválida'}
            </div>
          )}
          {isAdaptive && <div className="hint">Cada aluno recebe o nível que combina com o desempenho dele.</div>}
        </div>
      </div>
      <div className="actions">
        {isAdaptive && levels ? (
          <>
            {present.map((l) => (
              <button key={l} type="button" className="secondary small" onClick={() => setEditing(l)}>
                Editar {LEVEL_LABEL[l]}
              </button>
            ))}
            <button type="button" className="secondary small" onClick={() => setBuilding(true)}>
              Níveis…
            </button>
          </>
        ) : (
          <>
            <button type="button" className="secondary small" onClick={() => setEditing('single')}>
              Editar jogo
            </button>
            <button
              type="button"
              className="secondary small"
              title="Monte as versões Fácil, Normal e Difícil: cada aluno joga a que combina com o desempenho dele"
              onClick={() => setBuilding(true)}
            >
              🎯 Tornar adaptativo
            </button>
          </>
        )}
        <button
          type="button"
          className="secondary small"
          disabled={libState === 'saving' || libState === 'saved'}
          title="Guarda uma cópia na sua biblioteca para usar em outras atividades"
          onClick={() => {
            setLibState('saving');
            const req =
              isAdaptive && levels
                ? api('/games/batch', { body: { games: present.map((l) => ({ gameType, config: levels[l] })) } })
                : api('/games', { body: { gameType, config } });
            req.then(() => setLibState('saved')).catch(() => setLibState('error'));
          }}
        >
          {libState === 'saved' ? 'Salvo ✔' : libState === 'error' ? 'Erro — tentar de novo' : 'Salvar na biblioteca'}
        </button>
        <button type="button" className="danger small" onClick={() => deleteNode()}>
          Remover
        </button>
      </div>
      {editing &&
        createPortal(
          <EditGameModal
            type={gameType as GameType}
            initialConfig={editing === 'single' || !levels ? config : levels[editing]}
            onSave={(c) => {
              if (editing === 'single' || !levels) updateAttributes({ config: c });
              else setLevels({ ...levels, [editing]: c });
              setEditing(null);
            }}
            onClose={() => setEditing(null)}
          />,
          document.body,
        )}
      {building &&
        createPortal(
          <AdaptiveBuilderModal
            type={gameType as GameType}
            initial={levels ?? { normal: config }}
            allowRemove={Boolean(levels)}
            onClose={() => setBuilding(false)}
            onSave={(_t, next) => {
              if (next) setLevels(next);
              else updateAttributes({ levels: null }); // volta a ser jogo fixo (fica a config atual)
              setBuilding(false);
            }}
          />,
          document.body,
        )}
    </NodeViewWrapper>
  );
}

// Bloco de nível principal (átomo) que guarda { blockId, gameType, config } e, no jogo adaptativo,
// `levels` (uma config por nível). O blockId identifica o jogo dentro da atividade e é a chave das
// notas (Fase 4). Na tela do aluno o servidor troca `levels` por `level` + a config daquele nível.
export const GameBlock = Node.create<GameBlockOptions>({
  name: 'gameBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return { allowRestart: false };
  },

  addAttributes() {
    return {
      blockId: { default: null },
      gameType: { default: null },
      config: { default: null, rendered: false },
      levels: { default: null, rendered: false },
      level: { default: null, rendered: false },
      adaptive: { default: null, rendered: false },
      levelCount: { default: null, rendered: false },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-game-block]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-game-block': '' }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(GameBlockView);
  },
});
