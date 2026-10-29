import { useMemo, useState } from 'react';
import { availableLevels, getGame, isGameType, listGames, type AnyGameModule, type GameType, type LevelConfigs } from '@playground/games';
import Modal from '../components/Modal';
import type { SavedGame } from '../types';
import GameTypeBadge from '../components/GameTypeBadge';
import AiGenerateModal from './AiGenerator';
import AdaptiveBuilderModal, { levelSets } from './AdaptiveBuilder';
import { LEVEL_LABEL } from '../components/LevelBadge';

export function EditGameModal({
  type,
  initialConfig,
  onSave,
  onClose,
  saveLabel = 'Aplicar alterações',
}: {
  type: GameType;
  initialConfig: unknown;
  onSave: (config: unknown) => void;
  onClose: () => void;
  saveLabel?: string;
}) {
  const game = getGame(type);
  return (
    <Modal title={`Editar jogo — ${game.label}`} onClose={onClose} wide>
      <game.Editor initialConfig={initialConfig} onSave={onSave} onCancel={onClose} saveLabel={saveLabel} />
    </Modal>
  );
}

interface NewGameProps {
  heading: string; // "Inserir jogo", "Novo jogo"
  saveLabel: string; // texto do botão do editor
  onClose: () => void;
  onCreate: (type: GameType, config: unknown, alsoSaveToLibrary: boolean) => void;
  // Dentro de uma atividade: jogos já salvos para reaproveitar + opção de salvar o novo na biblioteca
  library?: SavedGame[];
  offerSave?: boolean;
  // Jogos salvos pelo gerador com IA (vários de uma vez)
  onLibrarySaved?: (games: SavedGame[]) => void;
  // Dentro de uma atividade: inserir um jogo adaptativo (uma config por nível)
  onCreateAdaptive?: (type: GameType, levels: LevelConfigs) => void;
}

// Escolha do jogo (busca) -> editor. Com `library`, também lista os jogos salvos.
export function NewGameModal({ heading, saveLabel, onClose, onCreate, library, offerSave, onLibrarySaved, onCreateAdaptive }: NewGameProps) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'library' | 'new'>(library && library.length > 0 ? 'library' : 'new');
  const [picked, setPicked] = useState<AnyGameModule | null>(null);
  const [alsoSave, setAlsoSave] = useState(true);
  const [ai, setAi] = useState(false);
  const [building, setBuilding] = useState<GameType | 'any' | null>(null);

  const q = query.trim().toLowerCase();
  const games = useMemo(() => listGames().filter((g) => !q || `${g.label} ${g.description}`.toLowerCase().includes(q)), [q]);
  const saved = useMemo(
    () =>
      (library ?? []).filter((g) => {
        if (!q) return true;
        const label = isGameType(g.gameType) ? getGame(g.gameType).label : g.gameType;
        return `${g.title} ${label}`.toLowerCase().includes(q);
      }),
    [library, q],
  );
  const sets = useMemo(
    () => (onCreateAdaptive && library ? levelSets(library).filter((s) => !q || s.title.toLowerCase().includes(q)) : []),
    [library, q, onCreateAdaptive],
  );

  if (building && onCreateAdaptive) {
    return (
      <AdaptiveBuilderModal
        type={building === 'any' ? undefined : building}
        library={library}
        onClose={onClose}
        onSave={(t, levels) => (levels ? onCreateAdaptive(t, levels) : setBuilding(null))}
      />
    );
  }

  if (picked && ai) {
    return (
      <AiGenerateModal
        type={picked.type}
        onClose={onClose}
        onBack={() => setAi(false)}
        onSaved={(games) => (onLibrarySaved ? onLibrarySaved(games) : onClose())}
        onInsert={offerSave ? (t, c) => onCreate(t, c, false) : undefined}
        onInsertAdaptive={onCreateAdaptive}
      />
    );
  }

  if (picked) {
    return (
      <Modal title={`Novo jogo — ${picked.label}`} onClose={onClose} wide>
        <div className="ai-cta">
          <span className="hint">Tem o material num GitBook? A IA monta este jogo em três níveis a partir do link.</span>
          <button type="button" className="secondary small" onClick={() => setAi(true)}>
            ✨ Gerar com IA
          </button>
        </div>
        {onCreateAdaptive && (
          <div className="ai-cta">
            <span className="hint">Quer que cada aluno jogue no nível dele? Monte as versões Fácil, Normal e Difícil.</span>
            <button type="button" className="secondary small" onClick={() => setBuilding(picked.type)}>
              🎯 Montar jogo adaptativo
            </button>
          </div>
        )}
        <picked.Editor
          onSave={(c: unknown) => onCreate(picked.type, c, offerSave ? alsoSave : false)}
          onCancel={() => setPicked(null)}
          saveLabel={saveLabel}
        />
        {offerSave && (
          <label className="check">
            <input type="checkbox" checked={alsoSave} onChange={(e) => setAlsoSave(e.target.checked)} />
            <span>Salvar também na minha biblioteca de jogos (para usar em outras atividades)</span>
          </label>
        )}
      </Modal>
    );
  }

  return (
    <Modal title={heading} onClose={onClose}>
      {library && (
        <div className="seg" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'library'} className={tab === 'library' ? 'on' : ''} onClick={() => setTab('library')}>
            Meus jogos ({library.length})
          </button>
          <button type="button" role="tab" aria-selected={tab === 'new'} className={tab === 'new' ? 'on' : ''} onClick={() => setTab('new')}>
            Criar novo
          </button>
        </div>
      )}
      <input
        type="search"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={tab === 'library' && library ? 'Buscar nos meus jogos…' : 'Buscar tipo de jogo (ex.: forca, quiz…)'}
        aria-label="Buscar jogo"
      />

      {tab === 'library' && library ? (
        <ul className="game-picker">
          {onCreateAdaptive && (
            <li>
              <button type="button" className="game-pick game-pick-adaptive" onClick={() => setBuilding('any')}>
                <strong>🎯 Montar jogo adaptativo…</strong>
                <span className="hint">Escolha as versões Fácil, Normal e Difícil; cada aluno joga a do nível dele.</span>
              </button>
            </li>
          )}
          {sets.map((s) => (
            <li key={s.key}>
              <button type="button" className="game-pick game-pick-adaptive" onClick={() => onCreateAdaptive?.(s.gameType, s.levels)}>
                <strong>🎯 {s.title}</strong>
                <GameTypeBadge type={s.gameType} />
                <span className="hint">
                  Adaptativo · {availableLevels(s.levels).map((l) => LEVEL_LABEL[l]).join(', ')}
                </span>
              </button>
            </li>
          ))}
          {saved.map((g) => {
            const game = isGameType(g.gameType) ? getGame(g.gameType) : null;
            return (
              <li key={g.id}>
                <button type="button" className="game-pick" onClick={() => onCreate(g.gameType as GameType, g.config, false)}>
                  <strong>{g.title}</strong>
                  <GameTypeBadge type={g.gameType} />
                  <span className="hint">
                    {game ? game.summarize(g.config) : ''} · até {g.maxScore ?? '—'} pontos
                  </span>
                </button>
              </li>
            );
          })}
          {saved.length === 0 && <li className="hint">{library.length === 0 ? 'Sua biblioteca está vazia. Crie um jogo na aba “Criar novo”.' : 'Nenhum jogo encontrado.'}</li>}
        </ul>
      ) : (
        <ul className="game-picker">
          {games.map((g) => (
            <li key={g.type}>
              <button type="button" className="game-pick" onClick={() => setPicked(g)}>
                <GameTypeBadge type={g.type} />
                <span className="hint">{g.description}</span>
              </button>
            </li>
          ))}
          {games.length === 0 && <li className="hint">Nenhum jogo encontrado.</li>}
        </ul>
      )}
    </Modal>
  );
}
