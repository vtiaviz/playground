import { useEffect, useState } from 'react';
import { getGame, listGames, type GameType, type LevelConfigs } from '@playground/games';
import { ApiError, api } from '../api';
import GameTypeBadge from '../components/GameTypeBadge';
import Modal from '../components/Modal';
import type { AiGeneration, AiStatus, SavedGame } from '../types';

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Erro inesperado.');
const LABEL = { easy: 'Fácil', normal: 'Normal', hard: 'Difícil' } as const;

interface Props {
  type?: GameType; // fixo quando aberto a partir de um jogo; sem ele, o instrutor escolhe
  onClose: () => void;
  onBack?: () => void; // volta para o editor manual do jogo
  onSaved?: (games: SavedGame[]) => void; // depois de salvar na biblioteca
  onInsert?: (type: GameType, config: unknown) => void; // dentro de uma atividade
  onInsertAdaptive?: (type: GameType, levels: LevelConfigs) => void; // os níveis como um jogo adaptativo
}

// Gerador de conteúdo com IA: link do GitBook -> três versões (fácil, normal, difícil) do jogo.
// Nada é gravado até o instrutor salvar (ou inserir na atividade).
export default function AiGenerateModal({ type: fixedType, onClose, onBack, onSaved, onInsert, onInsertAdaptive }: Props) {
  const [type, setType] = useState<GameType>(fixedType ?? 'QUIZ');
  const [url, setUrl] = useState('');
  const [instructions, setInstructions] = useState('');
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [gen, setGen] = useState<AiGeneration | null>(null);
  const [tab, setTab] = useState(0);
  const [editing, setEditing] = useState(false);
  const [picked, setPicked] = useState<boolean[]>([true, true, true]);
  const [savedNote, setSavedNote] = useState('');

  useEffect(() => {
    api<AiStatus>('/ai/status').then(setStatus).catch(() => setStatus({ enabled: false, provider: '', model: '' }));
  }, []);

  const game = getGame(gen ? gen.gameType : type);

  const generate = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await api<AiGeneration>('/ai/generate', { body: { gameType: type, url, instructions } });
      setGen(r);
      setPicked(r.levels.map((l) => l.config !== null));
      setTab(Math.max(0, r.levels.findIndex((l) => l.config !== null)));
      setEditing(false);
      setSavedNote('');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!gen) return;
    const games = gen.levels.filter((l, i) => picked[i] && l.config !== null).map((l) => ({ gameType: gen.gameType, config: l.config }));
    setBusy(true);
    setError('');
    try {
      const r = await api<{ games: SavedGame[] }>('/games/batch', { body: { games } });
      setSavedNote(`✔ ${r.games.length} ${r.games.length === 1 ? 'jogo salvo' : 'jogos salvos'} na biblioteca.`);
      onSaved?.(r.games);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const title = fixedType ? `Gerar com IA — ${getGame(fixedType).label}` : 'Gerar jogos com IA';

  // ---------- 1) link do material ----------
  if (!gen) {
    return (
      <Modal title={title} onClose={onClose}>
        <form
          className="stack ai-form"
          onSubmit={(e) => {
            e.preventDefault();
            void generate();
          }}
        >
          <p className="hint">
            Cole o link de uma página do GitBook (ou outra página pública). A IA lê a página e cria o jogo em três níveis: fácil, normal e difícil.
            Você confere, ajusta e salva.
          </p>

          {!fixedType && (
            <fieldset className="ai-types">
              <legend>Jogo</legend>
              {listGames().map((g) => (
                <label key={g.type} className={`ai-type${type === g.type ? ' on' : ''}`}>
                  <input type="radio" name="ai-type" checked={type === g.type} onChange={() => setType(g.type)} />
                  <GameTypeBadge type={g.type} />
                </label>
              ))}
            </fieldset>
          )}

          <label>
            Link do material
            <input type="url" required autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://seu-espaco.gitbook.io/aula/redes" />
          </label>
          <label>
            <span>
              Instruções extras <span className="hint">(opcional)</span>
            </span>
            <input value={instructions} maxLength={500} onChange={(e) => setInstructions(e.target.value)} placeholder="Ex.: foque em protocolos; público do 1º ano" />
          </label>

          {status && !status.enabled && (
            <p className="error" role="alert">
              O gerador com IA não está configurado. Defina <code>AI_API_KEY</code> no <code>apps/api/.env</code> e reinicie a API.
            </p>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <div className="actions">
            {onBack && (
              <button type="button" className="secondary" onClick={onBack}>
                Voltar
              </button>
            )}
            <button type="submit" disabled={busy || !url.trim() || status?.enabled === false}>
              {busy ? 'Lendo a página e gerando…' : '✨ Gerar 3 níveis'}
            </button>
          </div>
          {busy && <p className="hint" role="status">Isso costuma levar de 10 a 40 segundos.</p>}
          {status?.enabled && <p className="hint ai-model">Modelo: {status.model} ({status.provider})</p>}
        </form>
      </Modal>
    );
  }

  // ---------- 2) conferir os três níveis ----------
  const level = gen.levels[tab];
  const count = gen.levels.filter((l, i) => picked[i] && l.config !== null).length;

  return (
    <Modal title={`${title} — ${gen.title}`} onClose={onClose} wide>
      <p className="hint">
        Fonte: <a href={gen.source.url} target="_blank" rel="noreferrer">{gen.source.title}</a>
        {gen.source.truncated && ' (página longa: só o começo foi usado)'}
      </p>

      <div className="seg" role="tablist">
        {gen.levels.map((l, i) => (
          <button
            key={l.level}
            type="button"
            role="tab"
            aria-selected={tab === i}
            className={tab === i ? 'on' : ''}
            onClick={() => {
              setTab(i);
              setEditing(false);
            }}
          >
            {LABEL[l.level]}
            {l.config === null && ' ⚠'}
          </button>
        ))}
      </div>

      {level.config === null ? (
        <p className="error">{level.error ?? 'Este nível não foi gerado.'} Clique em “Gerar de novo”.</p>
      ) : editing ? (
        <game.Editor
          initialConfig={level.config}
          saveLabel="Aplicar alterações"
          onCancel={() => setEditing(false)}
          onSave={(c: unknown) => {
            setGen({
              ...gen,
              levels: gen.levels.map((l, i) => (i === tab ? { ...l, config: c, title: (c as { title?: string }).title ?? l.title, edited: true } : l)),
            });
            setEditing(false);
          }}
        />
      ) : (
        <div className="ai-level">
          <div className="ai-level-head">
            <strong>{level.title}</strong>
            <span className="hint">
              {game.summarize(level.config)} · até {game.maxScore(level.config)} pontos
            </span>
            <button type="button" className="secondary small" onClick={() => setEditing(true)}>
              Editar conteúdo
            </button>
          </div>
          {level.edited ? (
            <p className="hint">Editado por você: confira no teste abaixo.</p>
          ) : (
            <details className="ai-key">
              <summary>Gabarito</summary>
              <ul>
                {level.answerKey.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </details>
          )}
          {/* key força reiniciar o jogo ao trocar de nível ou editar */}
          <game.Player key={`${tab}-${JSON.stringify(level.config).length}`} config={level.config} allowRestart />
        </div>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {savedNote && (
        <p className="hint" role="status">
          {savedNote}
        </p>
      )}

      {!editing && (
        <div className="ai-footer">
          <div className="ai-picks">
            <span>{onInsertAdaptive ? 'Níveis (biblioteca e jogo adaptativo):' : 'Salvar na biblioteca:'}</span>
            {gen.levels.map((l, i) => (
              <label key={l.level} className="check">
                <input
                  type="checkbox"
                  disabled={l.config === null}
                  checked={picked[i] && l.config !== null}
                  onChange={(e) => setPicked(picked.map((p, k) => (k === i ? e.target.checked : p)))}
                />
                <span>{LABEL[l.level]}</span>
              </label>
            ))}
          </div>
          <div className="actions">
            <button type="button" className="secondary" disabled={busy} onClick={() => setGen(null)}>
              Gerar de novo
            </button>
            {onInsertAdaptive && count >= 2 && (
              <button
                type="button"
                disabled={busy}
                title="Cada aluno recebe o nível que combina com o desempenho dele; o nível se ajusta sozinho"
                onClick={() =>
                  onInsertAdaptive(
                    gen.gameType,
                    Object.fromEntries(gen.levels.filter((l, i) => picked[i] && l.config !== null).map((l) => [l.level, l.config])),
                  )
                }
              >
                🎯 Inserir jogo adaptativo ({count} níveis)
              </button>
            )}
            {onInsert && level.config !== null && (
              <button type="button" className="secondary" disabled={busy} onClick={() => onInsert(gen.gameType, level.config)}>
                Inserir “{LABEL[level.level]}” na atividade
              </button>
            )}
            <button type="button" disabled={busy || count === 0} onClick={() => void save()}>
              {busy ? 'Salvando…' : `Salvar ${count} ${count === 1 ? 'jogo' : 'jogos'} na biblioteca`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
