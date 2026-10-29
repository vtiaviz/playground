import { useState } from 'react';
import { ApiError, api } from '../../api';
import Modal from '../../components/Modal';
import type { ActivitySummary } from '../../types';
import { useTeams } from './TeamsContext';

interface Props {
  activity: ActivitySummary;
  onClose: () => void;
  onDone: (a: ActivitySummary) => void;
}

// ISO -> valor do <input type="datetime-local"> (horário local)
const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function PublishModal({ activity, onClose, onDone }: Props) {
  const { teams, loading } = useTeams();
  const [selected, setSelected] = useState<string[]>(activity.teams.map((t) => t.id));
  const [due, setDue] = useState(toLocalInput(activity.dueAt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const r = await api<{ activity: ActivitySummary }>(`/activities/${activity.id}/publish`, {
        body: { teamIds: selected, dueAt: due ? new Date(due).toISOString() : null },
      });
      onDone(r.activity);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro inesperado.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={activity.status === 'PUBLISHED' ? 'Turmas da atividade' : 'Publicar atividade'} onClose={onClose}>
      <p className="hint">Os alunos das turmas marcadas passam a ver a atividade na lista deles.</p>

      {loading && <p className="hint">Carregando turmas…</p>}
      {!loading && teams.length === 0 && <p className="hint">Você ainda não tem turmas. Crie uma na barra lateral.</p>}

      <ul className="team-checks">
        {teams.map((t) => (
          <li key={t.id}>
            <label className="check">
              <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggle(t.id)} />
              <span>
                {t.name}
                <span className="hint">
                  {' '}
                  · {t.shift ? `${t.shift} · ` : ''}
                  {t.studentCount} {t.studentCount === 1 ? 'aluno' : 'alunos'}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      <label>
        Prazo (opcional)
        <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
      </label>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button type="button" onClick={submit} disabled={busy || selected.length === 0}>
          {busy ? 'Publicando…' : activity.status === 'PUBLISHED' ? 'Salvar turmas' : 'Publicar'}
        </button>
        <button type="button" className="secondary" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </Modal>
  );
}
