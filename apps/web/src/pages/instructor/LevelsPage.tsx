import { useCallback, useEffect, useState } from 'react';
import { GAME_TYPES, getGame } from '@playground/games';
import { ApiError, api } from '../../api';
import { ChartCard } from '../../components/charts';
import GameTypeBadge from '../../components/GameTypeBadge';
import LevelBadge, { LEVEL_LABEL } from '../../components/LevelBadge';
import Modal from '../../components/Modal';
import type { Level, LevelCell, LevelsOverview, StudentLevelsCard } from '../../types';
import { useTeams } from './TeamsContext';

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Erro inesperado.');
const fmtDate = (s: string) => new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const gameLabel = (t: string) => getGame(t as (typeof GAME_TYPES)[number]).label;
const LEVELS: Level[] = ['easy', 'normal', 'hard'];

function Trend({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined || Math.abs(value) < 5) return null;
  return value > 0 ? (
    <span className="trend up" title={`Melhorou ${value} pontos em relação às partidas anteriores`}>
      ↑
    </span>
  ) : (
    <span className="trend down" title={`Caiu ${-value} pontos em relação às partidas anteriores`}>
      ↓
    </span>
  );
}

function Cell({ c }: { c: LevelCell }) {
  return (
    <span className="level-cell">
      {c.level ? (
        <LevelBadge level={c.level} locked={c.locked} />
      ) : (
        <span className="hint" title="Ainda sem partida adaptativa neste jogo">
          começa no {LEVEL_LABEL[c.startsAt ?? 'normal']}
        </span>
      )}
      {c.avgPerformance != null && (
        <span className="level-perf" title={`Desempenho médio nas últimas partidas (${c.plays ?? 0} no total)`}>
          {c.avgPerformance}
          <Trend value={c.trend} />
        </span>
      )}
    </span>
  );
}

// Barras empilhadas com as cores dos níveis; os números ficam sempre escritos ao lado
function LevelDistribution({ rows }: { rows: LevelsOverview['distribution'] }) {
  return (
    <div className="hbars level-dist">
      {rows.map((d) => {
        const total = d.easy + d.normal + d.hard;
        return (
          <div key={d.gameType} className="hbar-row">
            <span className="hbar-label">{gameLabel(d.gameType)}</span>
            <span className="stack-track" aria-hidden="true">
              {total === 0 ? (
                <span className="stack-empty" />
              ) : (
                LEVELS.map((l) => (d[l] > 0 ? <span key={l} className={`stack-seg seg-${l}`} style={{ flexGrow: d[l] }} title={`${LEVEL_LABEL[l]}: ${d[l]}`} /> : null))
              )}
            </span>
            <span className="level-dist-nums">
              {total === 0 ? (
                <span className="hint">ninguém jogou ainda</span>
              ) : (
                LEVELS.map((l) => (
                  <span key={l}>
                    {LEVEL_LABEL[l]} <strong>{d[l]}</strong>
                  </span>
                ))
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------- ficha de níveis de um aluno ----------

export function StudentLevelsModal({ studentId, onClose, onChanged }: { studentId: string; onClose: () => void; onChanged?: () => void }) {
  const [card, setCard] = useState<StudentLevelsCard | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    api<StudentLevelsCard>(`/levels/students/${studentId}`)
      .then(setCard)
      .catch((e) => setError(errMsg(e)));
  }, [studentId]);
  useEffect(load, [load]);

  const update = async (gameType: string, body: { level?: Level; locked?: boolean }) => {
    setBusy(gameType);
    setError('');
    try {
      await api(`/levels/students/${studentId}/${gameType}`, { method: 'PUT', body });
      load();
      onChanged?.();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal title={card ? `Níveis — ${card.student.name}` : 'Níveis do aluno'} onClose={onClose} wide>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!card && !error && <p className="hint">Carregando…</p>}
      {card && (
        <>
          <p className="hint">
            O nível muda sozinho depois de cada jogo adaptativo. Você pode trocar o nível e <strong>fixar</strong> (o ajuste automático para até você
            liberar).
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Jogo</th>
                  <th>Nível</th>
                  <th>Partidas adaptativas</th>
                  <th>Último desempenho</th>
                  <th>Ajustar</th>
                </tr>
              </thead>
              <tbody>
                {card.games.map((g) => {
                  const current = g.level ?? g.startsAt ?? 'normal';
                  return (
                    <tr key={g.gameType}>
                      <td>
                        <GameTypeBadge type={g.gameType} />
                      </td>
                      <td>
                        <Cell c={g} />
                        {g.streak !== 0 && !g.locked && (
                          <span className="hint">
                            {' '}
                            · {g.streak > 0 ? `${g.streak} bom seguido (mais 1 sobe)` : `${-g.streak} baixo seguido (mais 1 desce)`}
                          </span>
                        )}
                      </td>
                      <td>{g.games}</td>
                      <td>{g.lastPerformance ?? '—'}</td>
                      <td>
                        <span className="actions level-controls">
                          <select
                            aria-label={`Nível em ${gameLabel(g.gameType)}`}
                            value={current}
                            disabled={busy === g.gameType}
                            onChange={(e) => void update(g.gameType, { level: e.target.value as Level })}
                          >
                            {LEVELS.map((l) => (
                              <option key={l} value={l}>
                                {LEVEL_LABEL[l]}
                              </option>
                            ))}
                          </select>
                          <label className="check">
                            <input
                              type="checkbox"
                              checked={g.locked}
                              disabled={busy === g.gameType}
                              onChange={(e) => void update(g.gameType, { locked: e.target.checked, level: current })}
                            />
                            <span>Fixar</span>
                          </label>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h3>Partidas</h3>
          {card.plays.length === 0 ? (
            <p className="hint">Nenhum jogo concluído ainda.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Atividade</th>
                    <th>Jogo</th>
                    <th>Nível</th>
                    <th>Pontos</th>
                    <th>Desempenho</th>
                    <th>Acertos</th>
                    <th>Ritmo</th>
                    <th>s/item</th>
                    <th>Chutes</th>
                    <th title="Pedidos de ajuda ao tutor IA (cada um desconta 3 do desempenho, até 15)">Ajudas</th>
                  </tr>
                </thead>
                <tbody>
                  {card.plays.map((p) => (
                    <tr key={`${p.activityId}-${p.blockId}`}>
                      <td>{fmtDate(p.completedAt)}</td>
                      <td>{p.activity}</td>
                      <td>{gameLabel(p.gameType)}</td>
                      <td>{p.level ? <LevelBadge level={p.level} /> : <span className="hint">fixo</span>}</td>
                      <td>
                        {p.score}/{p.maxScore}
                      </td>
                      <td>
                        <strong>{p.performance ?? '—'}</strong>
                      </td>
                      <td>{p.metrics ? `${p.metrics.accuracy}%` : '—'}</td>
                      <td>{p.metrics?.speed != null ? `${p.metrics.speed}%` : '—'}</td>
                      <td>{p.metrics?.avgSecondsPerItem != null ? p.metrics.avgSecondsPerItem.toLocaleString('pt-BR') : '—'}</td>
                      <td>{p.metrics ? p.metrics.guesses : '—'}</td>
                      <td>{p.metrics?.hints ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3>💡 Conversas com o tutor</h3>
          {card.tutor.length === 0 ? (
            <p className="hint">O aluno ainda não pediu ajuda ao tutor IA.</p>
          ) : (
            <ul className="tutor-log">
              {card.tutor.map((m) => (
                <li key={m.id}>
                  <div className="hint">
                    {fmtDate(m.createdAt)} · {m.activity} · {gameLabel(m.gameType)} · {m.item} ·{' '}
                    {m.trigger === 'IDLE' ? 'aceitou a ajuda oferecida' : m.trigger === 'BUTTON' ? 'pediu ajuda' : 'perguntou'}
                  </div>
                  {m.question && <p className="tutor-msg me">{m.question}</p>}
                  <p className="tutor-msg">{m.reply}</p>
                  {m.filtered && (
                    <p className="hint">⚠ A IA tentou entregar a resposta; o sistema trocou o texto por outra pista.</p>
                  )}
                </li>
              ))}
            </ul>
          )}

          <h3>Histórico de níveis</h3>
          {card.events.length === 0 ? (
            <p className="hint">Sem mudanças ainda.</p>
          ) : (
            <ul className="level-history">
              {card.events.map((e) => (
                <li key={e.id}>
                  <span className="hint">{fmtDate(e.createdAt)}</span> · {gameLabel(e.gameType)} ·{' '}
                  {e.fromLevel && e.fromLevel !== e.toLevel ? (
                    <>
                      <LevelBadge level={e.fromLevel} /> → <LevelBadge level={e.toLevel} />
                    </>
                  ) : (
                    <LevelBadge level={e.toLevel} />
                  )}{' '}
                  · {e.reason}
                  {e.source === 'INSTRUCTOR' ? ' (você)' : e.activity ? ` — ${e.activity}` : ''}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Modal>
  );
}

// ---------- página ----------

export default function LevelsPage() {
  const { teams } = useTeams();
  const [teamId, setTeamId] = useState('');
  const [data, setData] = useState<LevelsOverview | null>(null);
  const [error, setError] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(() => {
    api<LevelsOverview>(`/levels${teamId ? `?teamId=${teamId}` : ''}`)
      .then((r) => {
        setData(r);
        setError('');
      })
      .catch((e) => setError(errMsg(e)));
  }, [teamId]);
  useEffect(load, [load]);

  const q = query.trim().toLowerCase();
  const rows = (data?.students ?? []).filter((s) => !q || s.name.toLowerCase().includes(q));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>🎯 Níveis dos alunos</h1>
          <p className="hint">Aprendizado personalizado: em cada tipo de jogo, cada aluno tem o próprio nível, ajustado pelo desempenho.</p>
        </div>
        <div className="actions">
          <select aria-label="Turma" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">Todas as turmas</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <details className="panel how-it-works">
        <summary>Como o nível é calculado</summary>
        <ul>
          <li>
            Ao terminar um jogo, o aluno recebe um <strong>desempenho de 0 a 100</strong>, medido item a item (pergunta, palavra ou lacuna):{' '}
            <strong>acertos</strong> valem 70% e o <strong>ritmo</strong> 30% (o tempo de cada item acertado comparado com o esperado: pergunta longa e
            palavra grande ganham mais tempo; aba em segundo plano não conta).
          </li>
          <li>
            Descontos: <strong>chutes</strong> (errar em menos de um terço do tempo de leitura), “Verificar” nas cruzadas, seleções erradas no
            caça-palavras, letras erradas na forca e <strong>pedidos de ajuda ao tutor IA</strong> (−3 cada, até −15; a nota em pontos não muda).
          </li>
          <li>
            <strong>Sobe</strong> de nível com 2 desempenhos seguidos a partir de 80, ou na hora com 90+. <strong>Desce</strong> com 2 seguidos abaixo
            de 50, ou na hora abaixo de 35. Entre 50 e 79 o nível fica.
          </li>
          <li>
            Quem nunca jogou um tipo de jogo começa na média dos níveis que já tem nos outros (sem histórico, Normal). Um jogo já começado não muda de
            nível no meio.
          </li>
          <li>Só os jogos adaptativos (🎯, com 2 ou 3 níveis) mudam o nível; os jogos fixos também mostram o desempenho.</li>
        </ul>
      </details>

      {error && <p className="error">{error}</p>}
      {!data && !error && <p className="hint">Carregando…</p>}
      {data && (
        <>
          <ChartCard
            title="Alunos por nível"
            subtitle="Em cada jogo, quantos alunos estão em cada nível (quem ainda não jogou aquele jogo fica de fora)"
            table={{
              head: ['Jogo', 'Fácil', 'Normal', 'Difícil', 'Sem partidas'],
              rows: data.distribution.map((d) => [gameLabel(d.gameType), d.easy, d.normal, d.hard, d.none]),
            }}
          >
            <LevelDistribution rows={data.distribution} />
          </ChartCard>

          <section className="panel">
            <div className="viz-head">
              <h2>Aluno a aluno</h2>
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar aluno…" aria-label="Buscar aluno" />
            </div>
            <p className="hint">O número ao lado do nível é o desempenho médio nas últimas 5 partidas (↑ melhorando, ↓ caindo). Clique no aluno para ver o histórico e ajustar.</p>
            <div className="table-wrap">
              <table className="levels-table">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    {GAME_TYPES.map((t) => (
                      <th key={t}>{gameLabel(t)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.studentId}>
                      <td>
                        <button type="button" className="link" onClick={() => setStudentId(s.studentId)}>
                          {s.name}
                        </button>
                        <div className="hint">{s.teams.join(', ')}</div>
                      </td>
                      {GAME_TYPES.map((t) => (
                        <td key={t}>
                          <Cell c={s.games[t]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={GAME_TYPES.length + 1} className="hint">
                        {data.students.length === 0 ? 'Nenhum aluno nas suas turmas.' : 'Nenhum aluno encontrado.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {studentId && <StudentLevelsModal studentId={studentId} onClose={() => setStudentId(null)} onChanged={load} />}
    </>
  );
}
