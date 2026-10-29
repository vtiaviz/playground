import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, api } from '../../api';
import Modal from '../../components/Modal';
import type { ActivityFull, ActivitySummary } from '../../types';
import PublishModal from './PublishModal';

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Erro inesperado.');
const fmt = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export default function ActivitiesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ActivitySummary[] | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState<ActivitySummary | null>(null);

  const load = useCallback(async () => {
    try {
      setItems((await api<{ activities: ActivitySummary[] }>('/activities')).activities);
      setError('');
    } catch (e) {
      setError(errMsg(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setBusy(true);
    try {
      const r = await api<{ activity: ActivityFull }>('/activities', { body: { title } });
      navigate(`/instrutor/atividades/${r.activity.id}`);
    } catch (e) {
      setError(errMsg(e));
      setCreating(false);
    } finally {
      setBusy(false);
    }
  };

  const unpublish = async (a: ActivitySummary) => {
    if (!window.confirm(`Voltar "${a.title}" para rascunho? Os alunos deixam de vê-la (as notas já gravadas continuam).`)) return;
    try {
      await api(`/activities/${a.id}/unpublish`, { method: 'POST', body: {} });
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const remove = async (a: ActivitySummary) => {
    const warn = a.hasScores ? ' ATENÇÃO: as notas dos alunos desta atividade também serão apagadas.' : '';
    if (!window.confirm(`Excluir a atividade "${a.title}"?${warn}`)) return;
    try {
      await api(`/activities/${a.id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Atividades</h1>
          <p className="hint">Monte aulas com texto e jogos e publique para uma ou mais turmas.</p>
        </div>
        <div className="actions">
          <button type="button" onClick={() => { setTitle(''); setCreating(true); }}>
            + Nova atividade
          </button>
        </div>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!items && !error && <p className="hint">Carregando…</p>}

      {items && items.length === 0 && (
        <section className="panel">
          <p className="hint">Nenhuma atividade ainda. Clique em “+ Nova atividade”.</p>
        </section>
      )}

      {items && items.length > 0 && (
        <section className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Situação</th>
                  <th>Turmas</th>
                  <th>Jogos</th>
                  <th>Atualizada</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link to={`/instrutor/atividades/${a.id}`}>{a.title}</Link>
                    </td>
                    <td>{a.status === 'PUBLISHED' ? <span className="badge ok">Publicada</span> : <span className="badge warn">Rascunho</span>}</td>
                    <td>{a.teams.length ? a.teams.map((t) => t.name).join(', ') : '—'}</td>
                    <td>{a.gameCount}</td>
                    <td>{fmt(a.updatedAt)}</td>
                    <td className="row-actions">
                      <Link to={`/instrutor/atividades/${a.id}`} className="button-link secondary small">
                        Editar
                      </Link>
                      <button type="button" className="secondary small" onClick={() => setPublishing(a)}>
                        {a.status === 'PUBLISHED' ? 'Turmas' : 'Publicar'}
                      </button>
                      {a.status === 'PUBLISHED' && (
                        <button type="button" className="secondary small" onClick={() => unpublish(a)}>
                          Despublicar
                        </button>
                      )}
                      <button type="button" className="danger small" onClick={() => remove(a)}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {creating && (
        <Modal title="Nova atividade" onClose={() => setCreating(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim()) void create();
            }}
          >
            <label>
              Título
              <input autoFocus value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <div className="actions">
              <button type="submit" disabled={busy || !title.trim()}>
                Criar e abrir o editor
              </button>
              <button type="button" className="secondary" onClick={() => setCreating(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {publishing && (
        <PublishModal
          activity={publishing}
          onClose={() => setPublishing(null)}
          onDone={async () => {
            setPublishing(null);
            await load();
          }}
        />
      )}
    </>
  );
}
