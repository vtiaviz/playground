import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError, api } from '../../api';
import CredentialsModal from '../../components/CredentialsModal';
import type { Credential, ImportResult, Student, Team } from '../../types';
import TeamFormModal from './TeamFormModal';
import { useTeams } from './TeamsContext';

const PLACEHOLDER = `Maria da Silva
João Souza; joao@escola.com
Ana Lima; 2024003
2024004; Pedro Alves; pedro@escola.com`;

interface TeamDetail {
  team: Team;
  students: Student[];
}

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Erro inesperado.');

function TeamContent({ teamId }: { teamId: string }) {
  const navigate = useNavigate();
  const { refresh: refreshTeams } = useTeams();

  const [data, setData] = useState<TeamDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(false);

  const [text, setText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [report, setReport] = useState<ImportResult | null>(null);

  const [credentials, setCredentials] = useState<{ title: string; list: Credential[] } | null>(null);
  const [actionError, setActionError] = useState('');
  const [busyAction, setBusyAction] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api<TeamDetail>(`/teams/${teamId}`));
      setLoadError('');
    } catch (e) {
      setLoadError(e instanceof ApiError && e.status === 404 ? 'Turma não encontrada.' : errMsg(e));
    }
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  const reloadAll = async () => {
    await Promise.all([load(), refreshTeams()]);
  };

  if (loadError) return <p className="error">{loadError}</p>;
  if (!data) return <p className="hint">Carregando…</p>;

  const { team, students } = data;
  const pending = students.filter((s) => s.mustChangePassword).length;

  const onImport = async () => {
    setImportError('');
    setReport(null);
    setImporting(true);
    try {
      const r = await api<ImportResult>(`/teams/${team.id}/students/import`, { body: { text } });
      setReport(r);
      setText(r.errors.length > 0 ? r.errors.map((x) => x.text).join('\n') : ''); // mantém só as linhas com erro
      if (r.created.length > 0) setCredentials({ title: 'Credenciais iniciais dos alunos', list: r.created });
      await reloadAll();
    } catch (e) {
      setImportError(errMsg(e));
    } finally {
      setImporting(false);
    }
  };

  const resetPasswords = async (studentIds?: string[]) => {
    setActionError('');
    setBusyAction(true);
    try {
      const r = await api<{ credentials: Credential[] }>(`/teams/${team.id}/students/reset-passwords`, {
        body: studentIds ? { studentIds } : {},
      });
      if (r.credentials.length === 0) setActionError('Nenhum aluno com senha pendente.');
      else setCredentials({ title: 'Novas senhas temporárias', list: r.credentials });
      await load();
    } catch (e) {
      setActionError(errMsg(e));
    } finally {
      setBusyAction(false);
    }
  };

  const removeStudent = async (s: Student) => {
    if (!window.confirm(`Remover ${s.name} desta turma? A conta e o histórico dele continuam existindo.`)) return;
    setActionError('');
    try {
      await api(`/teams/${team.id}/students/${s.id}`, { method: 'DELETE' });
      await reloadAll();
    } catch (e) {
      setActionError(errMsg(e));
    }
  };

  const deleteTeam = async () => {
    if (!window.confirm(`Excluir a turma "${team.name}"? Os alunos saem da turma (as contas continuam existindo).`)) return;
    try {
      await api(`/teams/${team.id}`, { method: 'DELETE' });
      await refreshTeams();
      navigate('/instrutor', { replace: true });
    } catch (e) {
      setActionError(errMsg(e));
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{team.name}</h1>
          <p className="hint">
            {team.shift ? `${team.shift} · ` : ''}
            {students.length} {students.length === 1 ? 'aluno' : 'alunos'}
            {pending > 0 && ` · ${pending} ainda não ${pending === 1 ? 'trocou' : 'trocaram'} a senha`}
          </p>
        </div>
        <div className="actions">
          <button type="button" className="secondary" onClick={() => setEditing(true)}>
            Editar
          </button>
          <button type="button" className="danger" onClick={deleteTeam}>
            Excluir
          </button>
        </div>
      </div>

      {actionError && (
        <p className="error" role="alert">
          {actionError}
        </p>
      )}

      <section className="panel">
        <h2>Importar alunos</h2>
        <p className="hint">
          Um aluno por linha, com nome, e-mail e/ou matrícula (em qualquer ordem). Separe os campos com <code>;</code>{' '}
          ou Tab — dá para colar direto de uma planilha. Quem não tiver e-mail nem matrícula recebe um login gerado
          pelo nome (ex.: <code>maria.silva</code>).
        </p>
        <textarea
          rows={7}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          spellCheck={false}
          aria-label="Lista de alunos"
        />
        {importError && (
          <p className="error" role="alert">
            {importError}
          </p>
        )}
        <div className="actions">
          <button type="button" onClick={onImport} disabled={importing || !text.trim()}>
            {importing ? 'Importando…' : 'Importar e gerar credenciais'}
          </button>
        </div>

        {report && (
          <div className="report" aria-live="polite">
            <p>
              <strong>{report.created.length}</strong> criado(s)
              {report.enrolledExisting.length > 0 && <>, <strong>{report.enrolledExisting.length}</strong> já existente(s) adicionado(s) à turma</>}
              {report.alreadyInTeam.length > 0 && <>, <strong>{report.alreadyInTeam.length}</strong> já estava(m) na turma</>}
              {report.errors.length > 0 && <>, <strong>{report.errors.length}</strong> com problema</>}.
            </p>
            {report.errors.length > 0 && (
              <>
                <p className="hint">As linhas com problema continuam na caixa acima para você corrigir:</p>
                <ul className="issues">
                  {report.errors.map((x) => (
                    <li key={`${x.line}-${x.text}`}>
                      <strong>Linha {x.line}:</strong> {x.message} <code>{x.text}</code>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="page-head">
          <h2>Alunos</h2>
          {pending > 0 && (
            <button type="button" className="secondary" disabled={busyAction} onClick={() => resetPasswords()}>
              Ver/gerar senhas dos {pending} pendente(s)
            </button>
          )}
        </div>

        {students.length === 0 ? (
          <p className="hint">Nenhum aluno nesta turma ainda.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Login</th>
                  <th>Matrícula</th>
                  <th>Situação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>
                      <code>{s.login}</code>
                    </td>
                    <td>{s.registration ?? '—'}</td>
                    <td>
                      {s.mustChangePassword ? <span className="badge warn">Aguardando 1º acesso</span> : <span className="badge ok">Ativo</span>}
                    </td>
                    <td className="row-actions">
                      <button type="button" className="secondary small" disabled={busyAction} onClick={() => resetPasswords([s.id])}>
                        Nova senha
                      </button>
                      <button type="button" className="danger small" onClick={() => removeStudent(s)}>
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <TeamFormModal
          team={team}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            await reloadAll();
          }}
        />
      )}

      {credentials && (
        <CredentialsModal
          title={credentials.title}
          credentials={credentials.list}
          teamName={team.name}
          onClose={() => setCredentials(null)}
        />
      )}
    </>
  );
}

// `key` reinicia todo o estado ao trocar de turma na barra lateral
export default function TeamPage() {
  const { id } = useParams();
  return id ? <TeamContent key={id} teamId={id} /> : null;
}
