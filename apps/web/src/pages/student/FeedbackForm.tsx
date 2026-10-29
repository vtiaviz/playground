import { useState } from 'react';
import { ApiError, api } from '../../api';
import Stars from '../../components/Stars';

interface Props {
  activityId: string;
  initial: { rating: number; comment: string | null } | null;
  onSaved: (f: { rating: number; comment: string | null }) => void;
}

export default function FeedbackForm({ activityId, initial, onSaved }: Props) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [comment, setComment] = useState(initial?.comment ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await api<{ feedback: { rating: number; comment: string | null } }>(`/student/activities/${activityId}/feedback`, {
        method: 'PUT',
        body: { rating, comment: comment.trim() || null },
      });
      setSent(true);
      onSaved(r.feedback);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro inesperado.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="feedback-form">
      <p>Como foi esta atividade?</p>
      <Stars value={rating} onChange={(n) => { setRating(n); setSent(false); }} />
      <label>
        Comentário (opcional)
        <textarea rows={3} maxLength={1000} value={comment} onChange={(e) => { setComment(e.target.value); setSent(false); }} />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button type="button" onClick={submit} disabled={busy || rating === 0}>
          {busy ? 'Enviando…' : initial || sent ? 'Atualizar avaliação' : 'Enviar avaliação'}
        </button>
        {sent && <span className="hint">Obrigado pela avaliação! ✔</span>}
      </div>
    </div>
  );
}
