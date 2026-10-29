import { useEffect, useMemo, useState } from 'react';
import { LEVELS, availableLevels, getGame, isGameType, listGames, type GameType, type LevelConfigs } from '@playground/games';
import { api } from '../api';
import GameTypeBadge from '../components/GameTypeBadge';
import { LEVEL_LABEL } from '../components/LevelBadge';
import Modal from '../components/Modal';
import type { Level, SavedGame } from '../types';

const SUFFIX = /\s*[—–-]\s*(Fácil|Normal|Difícil)\s*$/i;
const LEVEL_OF: Record<string, Level> = { fácil: 'easy', normal: 'normal', difícil: 'hard' };

export interface LevelSet {
  key: string;
  gameType: GameType;
  title: string;
  levels: LevelConfigs;
}

// Conjuntos "Título — Fácil/Normal/Difícil" da biblioteca (como o gerador com IA salva), com 2+ níveis.
// Se houver dois jogos com o mesmo título e nível, vale o mais recente (a lista vem do mais novo).
export function levelSets(library: SavedGame[]): LevelSet[] {
  const sets = new Map<string, LevelSet>();
  for (const g of library) {
    if (!isGameType(g.gameType)) continue;
    const m = g.title.match(SUFFIX);
    if (!m) continue;
    const level = LEVEL_OF[m[1].toLowerCase()];
    const title = g.title.replace(SUFFIX, '').trim();
    const key = `${g.gameType}:${title.toLowerCase()}`;
    const set = sets.get(key) ?? { key, gameType: g.gameType, title, levels: {} };
    if (set.levels[level] === undefined) set.levels[level] = g.config;
    sets.set(key, set);
  }
  return [...sets.values()].filter((s) => availableLevels(s.levels).length >= 2);
}

interface Props {
  type?: GameType; // fixo quando aberto a partir de um jogo
  initial?: LevelConfigs;
  library?: SavedGame[]; // sem ela, carrega da API
  allowRemove?: boolean; // jogo já adaptativo: pode voltar a ser fixo
  onClose: () => void;
  onSave: (type: GameType, levels: LevelConfigs | null) => void;
}

// Monta um jogo adaptativo: uma versão por nível (pelo menos 2), vindas da biblioteca ou criadas aqui.
export default function AdaptiveBuilderModal({ type: fixedType, initial, library: given, allowRemove, onClose, onSave }: Props) {
  const [type, setType] = useState<GameType>(fixedType ?? 'QUIZ');
  const [levels, setLevels] = useState<LevelConfigs>(initial ?? {});
  const [library, setLibrary] = useState<SavedGame[] | null>(given ?? null);
  const [editing, setEditing] = useState<Level | null>(null);

  useEffect(() => {
    if (given) return;
    api<{ games: SavedGame[] }>('/games')
      .then((r) => setLibrary(r.games))
      .catch(() => setLibrary([]));
  }, [given]);

  const game = getGame(type);
  const ofType = useMemo(() => (library ?? []).filter((g) => g.gameType === type), [library, type]);
  const sets = useMemo(() => levelSets(library ?? []).filter((s) => s.gameType === type), [library, type]);
  const count = availableLevels(levels).length;

  if (editing) {
    return (
      <Modal title={`${game.label} — versão ${LEVEL_LABEL[editing]}`} onClose={onClose} wide>
        <game.Editor
          initialConfig={levels[editing]}
          saveLabel={`Usar no nível ${LEVEL_LABEL[editing]}`}
          onCancel={() => setEditing(null)}
          onSave={(c: unknown) => {
            setLevels({ ...levels, [editing]: c });
            setEditing(null);
          }}
        />
      </Modal>
    );
  }

  return (
    <Modal title="🎯 Jogo adaptativo" onClose={onClose} wide>
      <p className="hint">
        Monte uma versão do jogo para cada nível. Cada aluno joga a versão que combina com o desempenho dele nos jogos de{' '}
        {game.label}, e o nível se ajusta sozinho depois de cada partida. Precisa de pelo menos 2 níveis. Dica: <strong>✨ Gerar com IA</strong>{' '}
        cria os três de uma vez.
      </p>

      {!fixedType && (
        <fieldset className="ai-types">
          <legend>Jogo</legend>
          {listGames().map((g) => (
            <label key={g.type} className={`ai-type${type === g.type ? ' on' : ''}`}>
              <input
                type="radio"
                name="adaptive-type"
                checked={type === g.type}
                onChange={() => {
                  setType(g.type);
                  setLevels({});
                }}
              />
              <GameTypeBadge type={g.type} />
            </label>
          ))}
        </fieldset>
      )}

      {sets.length > 0 && (
        <label>
          Usar um conjunto da biblioteca
          <select
            value=""
            onChange={(e) => {
              const s = sets.find((x) => x.key === e.target.value);
              if (s) setLevels({ ...s.levels });
            }}
          >
            <option value="">Escolha…</option>
            {sets.map((s) => (
              <option key={s.key} value={s.key}>
                {s.title} ({availableLevels(s.levels).map((l) => LEVEL_LABEL[l]).join(', ')})
              </option>
            ))}
          </select>
        </label>
      )}

      <ul className="level-rows">
        {LEVELS.map((l) => {
          const c = levels[l];
          return (
            <li key={l} className="level-row">
              <span className={`level-badge level-${l}`}>{LEVEL_LABEL[l]}</span>
              <span className="level-row-info">
                {c !== undefined ? (
                  <>
                    <strong>{(c as { title?: string }).title ?? game.label}</strong>
                    <span className="hint">
                      {game.summarize(c)} · até {game.maxScore(c)} pontos
                    </span>
                  </>
                ) : (
                  <span className="hint">Sem versão neste nível</span>
                )}
              </span>
              <span className="actions">
                {ofType.length > 0 && (
                  <select
                    aria-label={`Escolher jogo da biblioteca para o nível ${LEVEL_LABEL[l]}`}
                    value=""
                    onChange={(e) => {
                      const g = ofType.find((x) => x.id === e.target.value);
                      if (g) setLevels({ ...levels, [l]: g.config });
                    }}
                  >
                    <option value="">Da biblioteca…</option>
                    {ofType.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                )}
                <button type="button" className="secondary small" onClick={() => setEditing(l)}>
                  {c !== undefined ? 'Editar' : 'Criar'}
                </button>
                {c !== undefined && (
                  <button
                    type="button"
                    className="secondary small"
                    onClick={() => {
                      const next = { ...levels };
                      delete next[l];
                      setLevels(next);
                    }}
                  >
                    Tirar
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="actions">
        {allowRemove && (
          <button type="button" className="secondary" onClick={() => onSave(type, null)}>
            Voltar a ser jogo fixo
          </button>
        )}
        <button type="button" className="secondary" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" disabled={count < 2} onClick={() => onSave(type, levels)}>
          {count < 2 ? 'Monte pelo menos 2 níveis' : `Usar jogo adaptativo (${count} níveis)`}
        </button>
      </div>
    </Modal>
  );
}
