import { useState, type FormEvent } from 'react';
import { ApiError, api } from '../../api';
import Modal from '../../components/Modal';
import type { Team } from '../../types';

interface Props {
  team?: Team; // sem turma = criar; com turma = editar
  onClose: () => void;
  onSaved: (team: Team) => void;
}

export default function TeamFormModal({ team, onClose, onSaved }: Props) {
  const [name, setName] = useState(team?.name ?? '');
  const [shift, setShift] = useState(team?.shift ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body = { name, shift };
      const r = team
        ? await api<{ team: Team }>(`/teams/${team.id}`, { method: 'PATCH', body })
        : await api<{ team: Team }>('/teams', { body });
      onSaved(r.team);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado.');
      setBusy(false);
    }
  };

  return (
    <Modal title={team ? 'Editar turma' : 'Nova turma'} onClose={onClose}>
      <form className="stack" onSubmit={onSubmit}>
        <label>
          Nome da turma
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus required />
        </label>
        <label>
          Turno (opcional)
          <input value={shift} onChange={(e) => setShift(e.target.value)} maxLength={40} placeholder="Manhã, Tarde, Noite…" />
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div className="actions">
          <button type="submit" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
