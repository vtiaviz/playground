import { useCallback, useEffect, useMemo, useState } from 'react';
import GameTypeBadge from '../../components/GameTypeBadge';
import { getGame, isGameType, type GameResult, type GameType } from '@playground/games';
import { ApiError, api } from '../../api';
import Modal from '../../components/Modal';
import AiGenerateModal from '../../editor/AiGenerator';
import { EditGameModal, NewGameModal } from '../../editor/GameModals';
import type { SavedGame } from '../../types';

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Erro inesperado.');
const fmt = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const labelOf = (t: string) => (isGameType(t) ? getGame(t).label : t);

type Dialog = { kind: 'new' } | { kind: 'ai' } | { kind: 'edit'; game: SavedGame } | { kind: 'play'; game: SavedGame } | null;

// Biblioteca de jogos do instrutor: cria, edita, testa, duplica e exclui.
// Para usar um jogo numa aula: no editor de atividades, "Inserir jogo" → "Meus jogos".
export default function GamesPage() {
  const [games, setGames] = useState<SavedGame[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<GameResult | null>(null);

  const load = useCallback(async () => {
    try {
      setGames((await api<{ games: SavedGame[] }>('/games')).games);
      setError('');
    } catch (e) {
      setError(errMsg(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (games ?? []).filter((g) => (!typeFilter || g.gameType === typeFilter) && (!q || g.title.toLowerCase().includes(q)));
  }, [games, typeFilter, query]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(ok);
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const create = (type: GameType, config: unknown) => {
    setDialog(null);
    return run(() => api('/games', { body: { gameType: type, config } }), 'Jogo salvo na biblioteca.');
  };
  const update = (g: SavedGame, config: unknown) => {
    setDialog(null);
    return run(() => api(`/games/${g.id}`, { method: 'PUT', body: { config } }), 'Alterações salvas.');
  };
  const duplicate = (g: SavedGame) => run(() => api(`/games/${g.id}/duplicate`, { method: 'POST', body: {} }), 'Cópia criada.');
  const remove = (g: SavedGame) => {
    if (!window.confirm(`Excluir "${g.title}" da biblioteca? Atividades que já usam este jogo não são afetadas.`)) return;
    return run(() => api(`/games/${g.id}`, { method: 'DELETE' }), 'Jogo excluído.');
  };

  const aiSaved = (saved: SavedGame[]) => {
    setDialog(null);
    setError('');
    setNotice(`${saved.length} ${saved.length === 1 ? 'jogo gerado com IA salvo' : 'jogos gerados com IA salvos'} na biblioteca.`);
    void load();
  };

  const types = [...new Set((games ?? []).map((g) => g.gameType))];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Meus jogos</h1>
          <p className="hint">
            Jogos prontos para reutilizar. Para colocar um numa aula, abra a atividade → <strong>Inserir jogo</strong> → <strong>Meus jogos</strong>.
            O jogo é copiado para a atividade, então editar aqui não muda aulas já publicadas.
          </p>
        </div>
        <div className="actions">
          <button type="button" className="secondary" onClick={() => setDialog({ kind: 'ai' })}>
            ✨ Gerar com IA
          </button>
          <button type="button" onClick={() => setDialog({ kind: 'new' })}>
            + Novo jogo
          </button>
        </div>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="hint" role="status">
          ✔ {notice}
        </p>
      )}
      {!games && !error && <p className="hint">Carregando…</p>}

      {games && games.length === 0 && (
        <section className="panel">
          <p className="hint">Nenhum jogo salvo ainda. Clique em “+ Novo jogo” para criar o primeiro.</p>
        </section>
      )}

      {games && games.length > 0 && (
        <section className="panel">
          <div className="filters">
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar pelo título…" aria-label="Buscar jogo" />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filtrar por tipo">
              <option value="">Todos os tipos</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {labelOf(t)}
                </option>
              ))}
            </select>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Tipo</th>
                  <th>Conteúdo</th>
                  <th>Pontos</th>
                  <th>Atualizado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <button type="button" className="link" onClick={() => { setResult(null); setDialog({ kind: 'play', game: g }); }}>
                        {g.title}
                      </button>
                    </td>
                    <td><GameTypeBadge type={g.gameType} /></td>
                    <td>{isGameType(g.gameType) ? getGame(g.gameType).summarize(g.config) : '—'}</td>
                    <td>{g.maxScore ?? '—'}</td>
                    <td>{fmt(g.updatedAt)}</td>
                    <td className="row-actions">
                      <button type="button" className="secondary small" onClick={() => { setResult(null); setDialog({ kind: 'play', game: g }); }}>
                        Jogar
                      </button>
                      <button type="button" className="secondary small" onClick={() => setDialog({ kind: 'edit', game: g })}>
                        Editar
                      </button>
                      <button type="button" className="secondary small" onClick={() => void duplicate(g)}>
                        Duplicar
                      </button>
                      <button type="button" className="danger small" onClick={() => void remove(g)}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={6} className="hint">
                      Nenhum jogo encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {dialog?.kind === 'new' && (
        <NewGameModal
          heading="Novo jogo"
          saveLabel="Salvar na biblioteca"
          onClose={() => setDialog(null)}
          onCreate={(t, c) => void create(t, c)}
          onLibrarySaved={aiSaved}
        />
      )}
      {dialog?.kind === 'ai' && <AiGenerateModal onClose={() => setDialog(null)} onSaved={aiSaved} />}
      {dialog?.kind === 'edit' && (
        <EditGameModal
          type={dialog.game.gameType as GameType}
          initialConfig={dialog.game.config}
          saveLabel="Salvar alterações"
          onClose={() => setDialog(null)}
          onSave={(c) => void update(dialog.game, c)}
        />
      )}
      {dialog?.kind === 'play' && isGameType(dialog.game.gameType) && (
        <Modal title={`Testar — ${dialog.game.title}`} onClose={() => setDialog(null)} wide>
          {(() => {
            const game = getGame(dialog.game.gameType as GameType);
            return <game.Player config={dialog.game.config} allowRestart onComplete={setResult} />;
          })()}
          {result && (
            <p className="hint">
              Resultado do teste (não é gravado): <strong>{result.score}</strong> de {result.maxScore} pontos em {result.durationSeconds}s.
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
