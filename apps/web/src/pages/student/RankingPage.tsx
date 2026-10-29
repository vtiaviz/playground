import { useEffect, useState } from 'react';
import { ApiError, api } from '../../api';
import type { RankRow, RankingResponse } from '../../types';

const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank));

export default function RankingPage() {
  const [data, setData] = useState<RankingResponse | null>(null);
  const [error, setError] = useState('');
  const [scope, setScope] = useState('general'); // 'general' ou id da turma

  useEffect(() => {
    api<RankingResponse>('/student/ranking')
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Erro inesperado.'));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="hint">Carregando…</p>;

  const rows: RankRow[] = scope === 'general' ? data.general : (data.teams.find((t) => t.id === scope)?.ranking ?? []);
  const mine = rows.find((r) => r.isMe);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Ranking</h1>
          {mine && (
            <p className="hint">
              Você está em <strong>{mine.rank}º</strong> lugar com <strong>{mine.total}</strong> pontos.
            </p>
          )}
        </div>
        <label className="inline-label">
          Ver
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="general">Geral</option>
            {data.teams.map((t) => (
              <option key={t.id} value={t.id}>
                Turma: {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="panel">
        {rows.length === 0 ? (
          <p className="hint">Ainda não há pontuação.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Posição</th>
                  <th>Aluno</th>
                  <th>Pontos</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.studentId} className={r.isMe ? 'me' : undefined}>
                    <td>{medal(r.rank)}</td>
                    <td>
                      {r.name}
                      {r.isMe && ' (você)'}
                    </td>
                    <td>{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
